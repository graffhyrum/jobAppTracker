import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import type {
	Contact,
	ContactForCreate,
	ContactId,
} from "#src/domain/entities/contact.ts";
import { createContact, updateContact } from "#src/domain/entities/contact.ts";
import type { JobApplicationId } from "#src/domain/entities/job-application.ts";
import type { ContactRepository } from "#src/domain/ports/contact-repository.ts";
import type { ForUpdate } from "#src/infrastructure/storage/storage-provider-interface.ts";

export function createInMemoryContactRepository(
	generateUUID: () => string = () => crypto.randomUUID(),
): ContactRepository {
	const contacts = new Map<ContactId, Contact>();

	return {
		create(data: ContactForCreate): ResultAsync<Contact, string> {
			const result = createContact(data, generateUUID);
			if (result.isErr()) {
				return errAsync(`Failed to create contact: ${result.error.message}`);
			}
			const contact = result.value;
			contacts.set(contact.id, contact);
			return okAsync(contact);
		},

		getById(id: ContactId): ResultAsync<Contact, string> {
			const contact = contacts.get(id);
			if (!contact) {
				return errAsync(`Contact with id ${id} not found`);
			}
			return okAsync(contact);
		},

		getByJobApplicationId(
			jobAppId: JobApplicationId,
		): ResultAsync<Contact[], string> {
			const filtered = Array.from(contacts.values())
				.filter((contact) => contact.jobApplicationId === jobAppId)
				.sort(
					(a, b) =>
						new Date(b.outreachDate).getTime() -
						new Date(a.outreachDate).getTime(),
				);
			return okAsync(filtered);
		},

		update(
			id: ContactId,
			data: ForUpdate<Contact>,
		): ResultAsync<Contact, string> {
			const existing = contacts.get(id);
			if (!existing) {
				return errAsync(`Contact with id ${id} not found`);
			}

			const updated = updateContact(existing, data);
			contacts.set(id, updated);
			return okAsync(updated);
		},

		delete(id: ContactId): ResultAsync<void, string> {
			contacts.delete(id);
			return okAsync(undefined);
		},
	};
}
