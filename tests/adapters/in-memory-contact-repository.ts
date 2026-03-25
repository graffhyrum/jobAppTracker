import { Effect, Either } from "effect";

import type {
	Contact,
	ContactForCreate,
	ContactId,
} from "#src/domain/entities/contact.ts";
import { createContact, updateContact } from "#src/domain/entities/contact.ts";
import { ContactError } from "#src/domain/entities/contact-error.ts";
import type { JobApplicationId } from "#src/domain/entities/job-application.ts";
import type { ContactRepository } from "#src/domain/ports/contact-repository.ts";
import type { ForUpdate } from "#src/domain/ports/common-types.ts";

export function createInMemoryContactRepository(
	generateUUID: () => string = () => crypto.randomUUID(),
): ContactRepository {
	const contacts = new Map<ContactId, Contact>();

	return {
		create(data: ContactForCreate) {
			const result = createContact(data, generateUUID);
			if (Either.isLeft(result)) {
				return Effect.fail(
					new ContactError({
						detail: `Failed to create contact: ${result.left.detail}`,
						operation: "create",
					}),
				);
			}
			const contact = result.right;
			contacts.set(contact.id, contact);
			return Effect.succeed(contact);
		},

		getById(id: ContactId) {
			const contact = contacts.get(id);
			if (!contact) {
				return Effect.fail(
					new ContactError({
						detail: `Contact with id ${id} not found`,
						operation: "getById",
					}),
				);
			}
			return Effect.succeed(contact);
		},

		getByJobApplicationId(jobAppId: JobApplicationId) {
			const filtered = Array.from(contacts.values())
				.filter((contact) => contact.jobApplicationId === jobAppId)
				.sort(
					(a, b) =>
						new Date(b.outreachDate).getTime() -
						new Date(a.outreachDate).getTime(),
				);
			return Effect.succeed(filtered);
		},

		getAll() {
			return Effect.succeed(Array.from(contacts.values()));
		},

		update(id: ContactId, data: ForUpdate<Contact>) {
			const existing = contacts.get(id);
			if (!existing) {
				return Effect.fail(
					new ContactError({
						detail: `Contact with id ${id} not found`,
						operation: "update",
					}),
				);
			}

			const updated = updateContact(existing, data);
			contacts.set(id, updated);
			return Effect.succeed(updated);
		},

		delete(id: ContactId) {
			contacts.delete(id);
			return Effect.succeed(undefined as void);
		},
	};
}
