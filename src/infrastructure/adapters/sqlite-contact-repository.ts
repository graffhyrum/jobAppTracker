import type { Database } from "bun:sqlite";
import { ArkErrors } from "arktype";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type {
	Contact,
	ContactForCreate,
	ContactId,
} from "../../domain/entities/contact.ts";
import { contactModule, createContact } from "../../domain/entities/contact.ts";
import type { JobApplicationId } from "../../domain/entities/job-application.ts";
import type { ContactRepository } from "../../domain/ports/contact-repository.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import type { ForUpdate } from "../storage/storage-provider-interface.ts";

export function createSQLiteContactRepository(db: Database): ContactRepository {
	return {
		create(data: ContactForCreate): ResultAsync<Contact, string> {
			const contactResult = createContact(data, uuidProvider.generateUUID);
			if (contactResult.isErr()) {
				return errAsync(`Failed to create contact: ${contactResult.error}`);
			}

			const contact = contactResult.value;

			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(`
                        INSERT INTO contacts (id, jobApplicationId, contactName, contactEmail, linkedInUrl,
                                              role, channel, outreachDate, responseReceived, notes,
                                              createdAt, updatedAt)
                        VALUES ($id, $jobApplicationId, $contactName, $contactEmail, $linkedInUrl,
                                $role, $channel, $outreachDate, $responseReceived, $notes,
                                $createdAt, $updatedAt)
                    `);

					query.run({
						$id: contact.id,
						$jobApplicationId: contact.jobApplicationId,
						$contactName: contact.contactName,
						$contactEmail: contact.contactEmail ?? null,
						$linkedInUrl: contact.linkedInUrl ?? null,
						$role: contact.role ?? null,
						$channel: contact.channel,
						$outreachDate: contact.outreachDate,
						$responseReceived: contact.responseReceived ? 1 : 0,
						$notes: contact.notes ?? null,
						$createdAt: contact.createdAt,
						$updatedAt: contact.updatedAt,
					});

					return contact;
				})(),
				(err) => `Failed to insert contact: ${err}`,
			);
		},

		getById(id: ContactId): ResultAsync<Contact, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare("SELECT * FROM contacts WHERE id = $id");
					const result = query.get({ $id: id });
					if (!result) {
						throw new Error(`Contact with id ${id} not found`);
					}
					return result;
				})(),
				(err) => `Failed to query contact: ${err}`,
			).andThen(parseContact);
		},

		getAll(): ResultAsync<Contact[], string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare("SELECT * FROM contacts ORDER BY outreachDate DESC");
					return query.all();
				})(),
				(err) => `Failed to query all contacts: ${err}`,
			).andThen(parseContactArray);
		},

		getByJobApplicationId(
			jobAppId: JobApplicationId,
		): ResultAsync<Contact[], string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare(
						"SELECT * FROM contacts WHERE jobApplicationId = $jobAppId ORDER BY outreachDate DESC",
					);
					return query.all({ $jobAppId: jobAppId });
				})(),
				(err) => `Failed to query contacts: ${err}`,
			).andThen(parseContactArray);
		},

		update(
			id: ContactId,
			data: ForUpdate<Contact>,
		): ResultAsync<Contact, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const getQuery = db.prepare("SELECT * FROM contacts WHERE id = $id");
					const current = getQuery.get({ $id: id });
					if (!current) {
						throw new Error(`Contact with id ${id} not found`);
					}

					const normalized = normalizeRow(current) as Record<string, unknown>;
					const updated = {
						...normalized,
						...data,
						updatedAt: new Date().toISOString(),
					} as Record<string, unknown>;

					const updateQuery = db.prepare(`
                        UPDATE contacts
                        SET jobApplicationId = $jobApplicationId,
                            contactName      = $contactName,
                            contactEmail     = $contactEmail,
                            linkedInUrl      = $linkedInUrl,
                            role             = $role,
                            channel          = $channel,
                            outreachDate     = $outreachDate,
                            responseReceived = $responseReceived,
                            notes            = $notes,
                            updatedAt        = $updatedAt
                        WHERE id = $id
                    `);

					updateQuery.run({
						$id: id,
						$jobApplicationId: updated.jobApplicationId as string,
						$contactName: updated.contactName as string,
						$contactEmail: (updated.contactEmail as string | undefined) ?? null,
						$linkedInUrl: (updated.linkedInUrl as string | undefined) ?? null,
						$role: (updated.role as string | undefined) ?? null,
						$channel: updated.channel as string,
						$outreachDate: updated.outreachDate as string,
						$responseReceived: (updated.responseReceived as boolean) ? 1 : 0,
						$notes: (updated.notes as string | undefined) ?? null,
						$updatedAt: updated.updatedAt as string,
					});

					return updated;
				})(),
				(err) => `Failed to update contact: ${err}`,
			).andThen(parseContact);
		},

		delete(id: ContactId): ResultAsync<void, string> {
			return ResultAsync.fromPromise(
				(async () => {
					const query = db.prepare("DELETE FROM contacts WHERE id = $id");
					query.run({ $id: id });
				})(),
				(err) => `Failed to delete contact: ${err}`,
			);
		},
	};
}

function parseContactArray(maybeArray: unknown) {
	const normalizedArray = Array.isArray(maybeArray)
		? maybeArray.map(normalizeRow)
		: maybeArray;

	const parsedResult = contactModule.Contact.array()(normalizedArray);
	if (parsedResult instanceof ArkErrors) {
		return errAsync(JSON.stringify(parsedResult, null, 2));
	}
	return okAsync(parsedResult);
}

function parseContact(maybeRecord: unknown) {
	const normalized = normalizeRow(maybeRecord);
	const parseResult = contactModule.Contact(normalized);
	if (parseResult instanceof ArkErrors) {
		return errAsync(JSON.stringify(parseResult, null, 2));
	}
	return okAsync(parseResult);
}

function normalizeRow(record: unknown): unknown {
	if (typeof record === "object" && record !== null) {
		const row = record as Record<string, unknown>;
		const normalized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(row)) {
			if (value === null) {
				continue;
			}

			if (key === "responseReceived" && typeof value === "number") {
				normalized[key] = value === 1;
			} else {
				normalized[key] = value;
			}
		}

		return normalized;
	}
	return record;
}
