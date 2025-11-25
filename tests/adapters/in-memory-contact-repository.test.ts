import { describe, expect, it } from "bun:test";
import { assertDefined } from "#helpers/assertDefined.ts";
import type { ContactForCreate } from "#src/domain/entities/contact.ts";
import type { JobApplicationId } from "#src/domain/entities/job-application.ts";
import { createInMemoryContactRepository } from "./in-memory-contact-repository.ts";

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

			const result = await repository.create(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const contact = result.value;
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

			const result = await repository.create(data);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.id).toBe("123e4567-e89b-12d3-a456-000000000000");
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

			const result = await repository.create(invalidData);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("Failed to create contact");
			}
		});

		it("should persist contact in memory", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const contact = createResult.value;
				const getResult = await repository.getById(contact.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					expect(getResult.value.id).toBe(contact.id);
					expect(getResult.value.contactName).toBe(contact.contactName);
				}
			}
		});
	});

	describe("getById", () => {
		it("should retrieve existing contact", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const getResult = await repository.getById(created.id);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					expect(getResult.value.id).toBe(created.id);
					expect(getResult.value.contactName).toBe(data.contactName);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryContactRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.getById(nonExistentId);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("getByJobApplicationId", () => {
		it("should return empty array when no contacts for job application", async () => {
			const repository = createInMemoryContactRepository();

			const result = await repository.getByJobApplicationId(jobAppId1);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});

		it("should return contacts for specific job application", async () => {
			const repository = createInMemoryContactRepository();

			await repository.create(createValidContactData(jobAppId1));
			await repository.create(createValidContactData(jobAppId1));
			await repository.create(createValidContactData(jobAppId2));

			const result = await repository.getByJobApplicationId(jobAppId1);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.length).toBe(2);
				for (const contact of result.value) {
					expect(contact.jobApplicationId).toBe(jobAppId1);
				}
			}
		});

		it("should return contacts sorted by outreach date descending", async () => {
			const repository = createInMemoryContactRepository();

			const oldDate = new Date("2023-01-01").toISOString();
			const middleDate = new Date("2023-06-01").toISOString();
			const recentDate = new Date("2023-12-01").toISOString();

			await repository.create({
				...createValidContactData(jobAppId1),
				outreachDate: oldDate,
			});
			await repository.create({
				...createValidContactData(jobAppId1),
				outreachDate: recentDate,
			});
			await repository.create({
				...createValidContactData(jobAppId1),
				outreachDate: middleDate,
			});

			const result = await repository.getByJobApplicationId(jobAppId1);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const contacts = result.value;
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

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const updateResult = await repository.update(created.id, {
					contactName: "Jane Smith",
					responseReceived: true,
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					expect(updateResult.value.contactName).toBe("Jane Smith");
					expect(updateResult.value.responseReceived).toBe(true);
					expect(updateResult.value.contactEmail).toBe(data.contactEmail);
				}
			}
		});

		it("should update updatedAt timestamp", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const created = createResult.value;
				const originalUpdatedAt = created.updatedAt;

				// Wait a bit to ensure timestamp changes
				await new Promise((resolve) => setTimeout(resolve, 10));

				const updateResult = await repository.update(created.id, {
					contactName: "Updated Name",
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					expect(updateResult.value.updatedAt).not.toBe(originalUpdatedAt);
				}
			}
		});

		it("should return error for non-existent ID", async () => {
			const repository = createInMemoryContactRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.update(nonExistentId, {
				contactName: "Updated Name",
			});

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toContain("not found");
			}
		});
	});

	describe("delete", () => {
		it("should delete existing contact", async () => {
			const repository = createInMemoryContactRepository();
			const data = createValidContactData();

			const createResult = await repository.create(data);
			expect(createResult.isOk()).toBe(true);

			if (createResult.isOk()) {
				const contact = createResult.value;
				const deleteResult = await repository.delete(contact.id);

				expect(deleteResult.isOk()).toBe(true);

				// Verify it's actually deleted
				const getResult = await repository.getById(contact.id);
				expect(getResult.isErr()).toBe(true);
			}
		});

		it("should not error when deleting non-existent ID", async () => {
			const repository = createInMemoryContactRepository();
			const nonExistentId = "123e4567-e89b-12d3-a456-999999999999" as const;

			const result = await repository.delete(nonExistentId);

			expect(result.isOk()).toBe(true);
		});
	});

	describe("isolation", () => {
		it("should maintain separate state between instances", async () => {
			const repository1 = createInMemoryContactRepository();
			const repository2 = createInMemoryContactRepository();

			await repository1.create(createValidContactData());

			const result1 = await repository1.getByJobApplicationId(jobAppId1);
			const result2 = await repository2.getByJobApplicationId(jobAppId1);

			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);

			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.length).toBe(1);
				expect(result2.value.length).toBe(0);
			}
		});
	});
});
