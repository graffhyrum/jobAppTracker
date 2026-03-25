import type { Database } from "bun:sqlite";

import { ArkErrors } from "arktype";
import { Effect, Either } from "effect";

import { ContactError } from "../../domain/entities/contact-error.ts";
import type {
	Contact,
	ContactForCreate,
	ContactId,
} from "../../domain/entities/contact.ts";
import { contactModule, createContact } from "../../domain/entities/contact.ts";
import type { JobApplicationId } from "../../domain/entities/job-application.ts";
import type { ForUpdate } from "../../domain/ports/common-types.ts";
import type { ContactRepository } from "../../domain/ports/contact-repository.ts";
import { uuidProvider } from "../di/uuid-provider.ts";
import { normalizeContactRow } from "../sqlite/normalize-sqlite-row.ts";

export function createSQLiteContactRepository(db: Database): ContactRepository {
	return {
		create(data: ContactForCreate) {
			const contactResult = createContact(data, uuidProvider.generateUUID);
			if (Either.isLeft(contactResult)) {
				return Effect.fail(
					new ContactError({
						detail: `Failed to create contact: ${contactResult.left.detail}`,
						operation: "create",
					}),
				);
			}

			const contact = contactResult.right;

			return Effect.tryPromise({
				try: async () => {
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
				},
				catch: (err) =>
					new ContactError({
						detail: `Failed to insert contact: ${err}`,
						operation: "create",
					}),
			});
		},

		getById(id: ContactId) {
			return Effect.tryPromise({
				try: async () => {
					const query = db.prepare("SELECT * FROM contacts WHERE id = $id");
					const result = query.get({ $id: id });
					if (!result) {
						throw new Error(`Contact with id ${id} not found`);
					}
					return result;
				},
				catch: (err) =>
					new ContactError({
						detail: `Failed to query contact: ${err}`,
						operation: "getById",
					}),
			}).pipe(Effect.flatMap(parseContact));
		},

		getAll() {
			return Effect.tryPromise({
				try: async () => {
					const query = db.prepare(
						"SELECT * FROM contacts ORDER BY outreachDate DESC",
					);
					return query.all();
				},
				catch: (err) =>
					new ContactError({
						detail: `Failed to query all contacts: ${err}`,
						operation: "getAll",
					}),
			}).pipe(Effect.flatMap(parseContactArray));
		},

		getByJobApplicationId(jobAppId: JobApplicationId) {
			return Effect.tryPromise({
				try: async () => {
					const query = db.prepare(
						"SELECT * FROM contacts WHERE jobApplicationId = $jobAppId ORDER BY outreachDate DESC",
					);
					return query.all({ $jobAppId: jobAppId });
				},
				catch: (err) =>
					new ContactError({
						detail: `Failed to query contacts: ${err}`,
						operation: "getByJobApplicationId",
					}),
			}).pipe(Effect.flatMap(parseContactArray));
		},

		update(id: ContactId, data: ForUpdate<Contact>) {
			return Effect.tryPromise({
				try: async () => {
					const getQuery = db.prepare("SELECT * FROM contacts WHERE id = $id");
					const current = getQuery.get({ $id: id });
					if (!current) {
						throw new Error(`Contact with id ${id} not found`);
					}

					const normalized = normalizeContactRow(current) as Record<
						string,
						unknown
					>;
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
				},
				catch: (err) =>
					new ContactError({
						detail: `Failed to update contact: ${err}`,
						operation: "update",
					}),
			}).pipe(Effect.flatMap(parseContact));
		},

		delete(id: ContactId) {
			return Effect.tryPromise({
				try: async () => {
					const query = db.prepare("DELETE FROM contacts WHERE id = $id");
					query.run({ $id: id });
				},
				catch: (err) =>
					new ContactError({
						detail: `Failed to delete contact: ${err}`,
						operation: "delete",
					}),
			});
		},
	};
}

function parseContactArray(
	maybeArray: unknown,
): Effect.Effect<Contact[], ContactError> {
	const normalizedArray = Array.isArray(maybeArray)
		? maybeArray.map(normalizeContactRow)
		: maybeArray;

	const parsedResult = contactModule.Contact.array()(normalizedArray);
	if (parsedResult instanceof ArkErrors) {
		return Effect.fail(
			new ContactError({
				detail: JSON.stringify(parsedResult, null, 2),
				operation: "parseContactArray",
			}),
		);
	}
	return Effect.succeed(parsedResult);
}

function parseContact(
	maybeRecord: unknown,
): Effect.Effect<Contact, ContactError> {
	const normalized = normalizeContactRow(maybeRecord);
	const parseResult = contactModule.Contact(normalized);
	if (parseResult instanceof ArkErrors) {
		return Effect.fail(
			new ContactError({
				detail: JSON.stringify(parseResult, null, 2),
				operation: "parseContact",
			}),
		);
	}
	return Effect.succeed(parseResult);
}
