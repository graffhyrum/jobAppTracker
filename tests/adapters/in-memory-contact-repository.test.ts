import { describe, expect, it } from "bun:test";
import { Effect, Either } from "effect";

import { assertDefined } from "#helpers/assertDefined.ts";
import type { ContactForCreate } from "#src/domain/entities/contact.ts";
import type { JobApplicationId } from "#src/domain/entities/job-application.ts";

import { createInMemoryContactRepository } from "./in-memory-contact-repository.ts";

/** Run an Effect and return an Either for test assertions */
async function run<T, E>(
	effect: Effect.Effect<T, E>,
): Promise<Either.Either<T, E>> {
	return Effect.runPromise(Effect.either(effect));
}

describe("InMemoryContactRepository", () => {
	const jobAppId1 = "123e4567-e89b-12d3-a456-000000000001" as JobApplicationId;
	const jobAppId2 = "123e4567-e89b-12d3-a456-000000000002" as JobApplicationId;

	// Test data factory
	const createValidContactData = (
		jobAppId: JobApplicationId = jobAppId1,
	): ContactForCreate => ({
		jobApplicationId: jobAppId,
		contactName: "John Doe",
		contactEmail: "john@example.com",
		channel: "email",
		outreachDate: new Date().toISOString(),
		responseReceived: false,
	});

	// Deterministic UUID generator
	const createMockUuidGenerator = (seed = 0) => {
		let counter = seed;
		return () =>
			`123e4567-e89b-12d3-a456-${String(counter++).padStart(12, "0")}`;
	};

	describe("create", () => {
		it("should create contact with valid data", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const result = await run(repository.create(data));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const contact = result.right;
				expect(contact.contactName).toBe(data.contactName);
				expect(contact.contactEmail).toBe(data.contactEmail);
				expect(contact.jobApplicationId).toBe(data.jobApplicationId);
				expect(contact.channel).toBe(data.channel);
				assertDefined(contact.id);
				assertDefined(contact.createdAt);
				assertDefined(contact.updatedAt);
			}
		});

		it("should use provided UUID generator", async () => {
			const mockGenerator = createMockUuidGenerator();
			const repository = createInMemoryContactRepository(mockGenerator);
			const data = createValidContactData();

			const result = await run(repository.create(data));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.id).toBe("123e4567-e89b-12d3-a456-000000000000");
			}
		});

		it("should return error for invalid contact data", async () => {
			const repository = createInMemoryContactRepository();
			const invalidData = {
				jobApplicationId: jobAppId1,
				contactName: "", // Invalid: empty string
				channel: "email",
				outreachDate: new Date().toISOString(),
				responseReceived: false,
			} as ContactForCreate;

			const result = await run(repository.create(invalidData));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("Failed to create contact");
			}
		});

		it("should persist contact in memory", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await run(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const contact = createResult.right;
				const getResult = await run(repository.getById(contact.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					expect(getResult.right.id).toBe(contact.id);
					expect(getResult.right.contactName).toBe(contact.contactName);
				}
			}
		});
	});

	describe("getById", () => {
		it("should retrieve existing contact", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await run(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const getResult = await run(repository.getById(created.id));

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					expect(getResult.right.id).toBe(created.id);
					expect(getResult.right.contactName).toBe(data.contactName);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryContactRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await run(repository.getById(nonExistentId));

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("getByJobApplicationId", () => {
		it("should return empty array when no contacts for job application", async () => {
			const repository = createInMemoryContactRepository();

			const result = await run(repository.getByJobApplicationId(jobAppId1));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return contacts for specific job application", async () => {
			const repository = createInMemoryContactRepository();

			await Effect.runPromise(repository.create(createValidContactData(jobAppId1)));
			await Effect.runPromise(repository.create(createValidContactData(jobAppId1)));
			await Effect.runPromise(repository.create(createValidContactData(jobAppId2)));

			const result = await run(repository.getByJobApplicationId(jobAppId1));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				expect(result.right.length).toBe(2);
				for (const contact of result.right) {
					expect(contact.jobApplicationId).toBe(jobAppId1);
				}
			}
		});

		it("should return contacts sorted by outreach date descending", async () => {
			const repository = createInMemoryContactRepository();

			const oldDate = new Date("2023-01-01").toISOString();
			const middleDate = new Date("2023-06-01").toISOString();
			const recentDate = new Date("2023-12-01").toISOString();

			await Effect.runPromise(
				repository.create({
					...createValidContactData(jobAppId1),
					outreachDate: oldDate,
				}),
			);
			await Effect.runPromise(
				repository.create({
					...createValidContactData(jobAppId1),
					outreachDate: recentDate,
				}),
			);
			await Effect.runPromise(
				repository.create({
					...createValidContactData(jobAppId1),
					outreachDate: middleDate,
				}),
			);

			const result = await run(repository.getByJobApplicationId(jobAppId1));

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const contacts = result.right;
				expect(contacts.length).toBe(3);
				const firstContact = contacts[0];
				const secondContact = contacts[1];
				const thirdContact = contacts[2];
				assertDefined(firstContact);
				assertDefined(secondContact);
				assertDefined(thirdContact);
				expect(firstContact.outreachDate).toBe(recentDate);
				expect(secondContact.outreachDate).toBe(middleDate);
				expect(thirdContact.outreachDate).toBe(oldDate);
			}
		});
	});

	describe("update", () => {
		it("should update existing contact", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await run(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const updateResult = await run(
					repository.update(created.id, {
						contactName: "Jane Smith",
						responseReceived: true,
					}),
				);

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					expect(updateResult.right.contactName).toBe("Jane Smith");
					expect(updateResult.right.responseReceived).toBe(true);
					expect(updateResult.right.contactEmail).toBe(data.contactEmail);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await run(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const created = createResult.right;
				const originalUpdatedAt = created.updatedAt;

				// Wait a bit to ensure timestamp changes
				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await run(
					repository.update(created.id, {
						contactName: "Updated Name",
					}),
				);

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					expect(updateResult.right.updatedAt).not.toBe(originalUpdatedAt);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryContactRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await run(
				repository.update(nonExistentId, {
					contactName: "Updated Name",
				}),
			);

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.detail).toContain("not found");
			}
		});
	});

	describe("delete", () => {
		it("should delete existing contact", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await run(repository.create(data));
			expect(Either.isRight(createResult)).toBe(true);

			if (Either.isRight(createResult)) {
				const contact = createResult.right;
				const deleteResult = await run(repository.delete(contact.id));

				expect(Either.isRight(deleteResult)).toBe(true);

				// Verify it's actually deleted
				const getResult = await run(repository.getById(contact.id));
				expect(Either.isLeft(getResult)).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const repository = createInMemoryContactRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await run(repository.delete(nonExistentId));

			expect(Either.isRight(result)).toBe(true);
		});
	});

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const repository1 = createInMemoryContactRepository();
			const repository2 = createInMemoryContactRepository();

			await Effect.runPromise(repository1.create(createValidContactData()));

			const result1 = await run(repository1.getByJobApplicationId(jobAppId1));
			const result2 = await run(repository2.getByJobApplicationId(jobAppId1));

			expect(Either.isRight(result1)).toBe(true);
			expect(Either.isRight(result2)).toBe(true);

			if (Either.isRight(result1) && Either.isRight(result2)) {
				expect(result1.right.length).toBe(1);
				expect(result2.right.length).toBe(0);
			}
		});
	});
});
