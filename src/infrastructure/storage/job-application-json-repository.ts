import { err, ok, type Result, type ResultAsync } from "neverthrow";
import type {
	JobApplication,
	JobApplicationForCreate,
} from "../../domain/entities/job-application";
import { jobApplicationFromData } from "../../domain/entities/job-application";
import type {
	DatabaseError,
	JobApplicationRepository,
} from "../../domain/ports/job-application-repository";
import { getEntries } from "../../helpers/entries.ts";
import { fileIOProvider } from "../di/file-io-provider.ts";
import type { SerializableJobApplication } from "./types";
import { toDatabaseError, wrapAsyncOperation } from "./utils";

/**
 * JSON file-based implementation of JobApplicationRepository using Bun.file
 */
export function createJobApplicationJsonRepository(
	filePath: string = "./data/job-applications.json",
): JobApplicationRepository {
	const readData = async (): Promise<SerializableJobApplication[]> => {
		try {
			const fileIO = fileIOProvider;

			const existsResult = await fileIO.exists(filePath);
			if (existsResult.isErr()) {
				throw existsResult.error;
			}

			if (!existsResult.value) {
				return [];
			}

			const contentResult = await fileIO.readText(filePath);
			if (contentResult.isErr()) {
				throw contentResult.error;
			}

			const content = contentResult.value;
			if (content.trim() === "") {
				return [];
			}

			const parsed = JSON.parse(content);
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			throw toDatabaseError(`Failed to read from ${filePath}`, error);
		}
	};

	const writeData = async (
		data: SerializableJobApplication[],
	): Promise<void> => {
		try {
			const fileIO = fileIOProvider;
			const content = JSON.stringify(data, null, 2);

			const writeResult = await fileIO.writeText(filePath, content);
			if (writeResult.isErr()) {
				throw writeResult.error;
			}
		} catch (error) {
			throw toDatabaseError(`Failed to write to ${filePath}`, error);
		}
	};

	const serializeJobApplication = (
		app: JobApplication,
	): SerializableJobApplication => {
		return {
			id: app.id,
			company: app.company,
			positionTitle: app.positionTitle,
			applicationDate: app.applicationDate,
			createdAt: app.createdAt,
			updatedAt: app.updatedAt,
			interestRating: app.interestRating,
			nextEventDate: app.nextEventDate,
			jobPostingUrl: app.jobPostingUrl,
			jobDescription: app.jobDescription,
			statusLog: app.statusLog,
			notes: app.notes.notes,
		};
	};

	const deserializeJobApplication = (
		data: SerializableJobApplication,
	): Result<JobApplication, DatabaseError> => {
		try {
			// Filter out undefined values for optional fields since ArkType doesn't accept them
			const cleanData: JobApplicationForCreate & {
				id: string;
				createdAt: string;
				updatedAt: string;
				statusLog: SerializableJobApplication["statusLog"];
				notes: SerializableJobApplication["notes"];
			} = {
				company: data.company,
				positionTitle: data.positionTitle,
				applicationDate: data.applicationDate,
				id: data.id,
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
				statusLog: data.statusLog,
				notes: data.notes,
			};

			if (data.interestRating !== undefined) {
				cleanData.interestRating = data.interestRating;
			}
			if (data.nextEventDate !== undefined) {
				cleanData.nextEventDate = data.nextEventDate;
			}
			if (data.jobPostingUrl !== undefined) {
				cleanData.jobPostingUrl = data.jobPostingUrl;
			}
			if (data.jobDescription !== undefined) {
				cleanData.jobDescription = data.jobDescription;
			}

			const result = jobApplicationFromData(cleanData);

			return result.isOk()
				? ok(result.value)
				: err(
						toDatabaseError(
							"Failed to deserialize job application",
							result.error,
						),
					);
		} catch (error) {
			return err(
				toDatabaseError("Failed to deserialize job application", error),
			);
		}
	};

	return {
		save: (application: JobApplication): ResultAsync<void, DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				const existingIndex = data.findIndex(
					(app) => app.id === application.id,
				);
				const serialized = serializeJobApplication(application);

				if (existingIndex >= 0) {
					data[existingIndex] = serialized;
				} else {
					data.push(serialized);
				}

				await writeData(data);
			}, "Failed to save application");
		},

		findById: (
			id: string,
		): ResultAsync<JobApplication | null, DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				const found = data.find((app) => app.id === id);
				if (!found) {
					return null;
				}
				const result = deserializeJobApplication(found);
				if (result.isErr()) {
					throw result.error;
				}
				return result.value;
			}, "Failed to find application by ID");
		},

		findAll: (): ResultAsync<JobApplication[], DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				const applications: JobApplication[] = [];
				for (const item of data) {
					const result = deserializeJobApplication(item);
					if (result.isErr()) {
						throw result.error;
					}
					applications.push(result.value);
				}
				return applications;
			}, "Failed to find all applications");
		},

		update: (application: JobApplication): ResultAsync<void, DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				const existingIndex = data.findIndex(
					(app) => app.id === application.id,
				);

				if (existingIndex < 0) {
					throw toDatabaseError(
						`Application with ID ${application.id} not found`,
						new Error("Application not found"),
					);
				}

				data[existingIndex] = serializeJobApplication(application);
				await writeData(data);
			}, "Failed to update application");
		},

		deleteById: (id: string): ResultAsync<void, DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				const existingIndex = data.findIndex((app) => app.id === id);

				if (existingIndex < 0) {
					throw toDatabaseError(
						`Application with ID ${id} not found`,
						new Error("Application not found"),
					);
				}

				data.splice(existingIndex, 1);
				await writeData(data);
			}, "Failed to delete application");
		},

		findByStatusCategory: (
			category: "active" | "inactive",
		): ResultAsync<JobApplication[], DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				const applications: JobApplication[] = [];

				for (const item of data) {
					const result = deserializeJobApplication(item);
					if (result.isErr()) {
						throw result.error;
					}
					const app = result.value;
					// Get the latest status from statusLog
					const statusEntries = getEntries(app.statusLog);
					if (statusEntries.length > 0) {
						// Sort by timestamp (ISO string) to get latest
						const sortedEntries = statusEntries.toSorted(([a], [b]) =>
							b.localeCompare(a),
						);
						const latestEntry = sortedEntries[0];
						if (latestEntry && latestEntry[1].category === category) {
							applications.push(app);
						}
					}
				}

				return applications;
			}, "Failed to find applications by status category");
		},

		findOverdue: (): ResultAsync<JobApplication[], DatabaseError> => {
			return wrapAsyncOperation(async () => {
				const data = await readData();
				const applications: JobApplication[] = [];
				const now = new Date();

				for (const item of data) {
					const result = deserializeJobApplication(item);
					if (result.isErr()) {
						throw result.error;
					}
					const app = result.value;
					if (app.nextEventDate) {
						const nextEventDate = new Date(app.nextEventDate);
						if (nextEventDate < now) {
							applications.push(app);
						}
					}
				}

				return applications;
			}, "Failed to find overdue applications");
		},
	};
}
