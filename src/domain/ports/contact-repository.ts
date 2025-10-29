import type { ResultAsync } from "neverthrow";
import type { ForUpdate } from "../../infrastructure/storage/storage-provider-interface.ts";
import type {
	Contact,
	ContactForCreate,
	ContactId,
} from "../entities/contact.ts";
import type { JobApplicationId } from "../entities/job-application.ts";

export interface ContactRepository {
	create(data: ContactForCreate): ResultAsync<Contact, string>;

	getById(id: ContactId): ResultAsync<Contact, string>;

	getByJobApplicationId(
		jobAppId: JobApplicationId,
	): ResultAsync<Contact[], string>;

	update(id: ContactId, data: ForUpdate<Contact>): ResultAsync<Contact, string>;

	delete(id: ContactId): ResultAsync<void, string>;
}
