import type { Effect } from "effect";

import type { ContactError } from "../entities/contact-error.ts";
import type {
	Contact,
	ContactForCreate,
	ContactId,
} from "../entities/contact.ts";
import type { JobApplicationId } from "../entities/job-application.ts";
import type { ForUpdate } from "./common-types.ts";

export interface ContactRepository {
	create(data: ContactForCreate): Effect.Effect<Contact, ContactError>;

	getById(id: ContactId): Effect.Effect<Contact, ContactError>;

	getAll(): Effect.Effect<Contact[], ContactError>;

	getByJobApplicationId(
		jobAppId: JobApplicationId,
	): Effect.Effect<Contact[], ContactError>;

	update(
		id: ContactId,
		data: ForUpdate<Contact>,
	): Effect.Effect<Contact, ContactError>;

	delete(id: ContactId): Effect.Effect<void, ContactError>;
}
