import { ArkErrors, scope } from "arktype";
import { err, ok, type Result } from "neverthrow";
import { uuidSchema } from "./uuid.ts";

export const contactScope = scope({
	"#dateTime": "string.date.iso",
	ContactId: uuidSchema,
	JobAppId: uuidSchema,
	ContactRole: "'recruiter'|'hiring manager'|'employee'|'referral'|'other'",
	ContactChannel: "'email'|'linkedin'|'phone'|'referral'|'other'",
	BaseProps: {
		jobApplicationId: "JobAppId",
		contactName: "string > 0",
		"contactEmail?": "string.email",
		"linkedInUrl?": "string.url",
		"role?": "ContactRole",
		channel: "ContactChannel",
		outreachDate: "dateTime",
		responseReceived: "boolean",
		"notes?": "string",
	},
	Contact: {
		"...": "BaseProps",
		id: "ContactId",
		createdAt: "dateTime",
		updatedAt: "dateTime",
	},
	forCreate: "BaseProps",
	forUpdate: "Partial<Omit<Contact, 'id'>>",
});

export const contactModule = contactScope.export();

export type ContactId = typeof contactModule.ContactId.infer;
export type ContactRole = typeof contactModule.ContactRole.infer;
export type ContactChannel = typeof contactModule.ContactChannel.infer;
export type Contact = typeof contactModule.Contact.infer;
export type ContactForCreate = typeof contactModule.forCreate.infer;
export type ContactForUpdate = typeof contactModule.forUpdate.infer;

export function createContactId(generateUUID: () => string): ContactId {
	return contactModule.ContactId.assert(generateUUID());
}

export function createContact(
	data: ContactForCreate,
	generateUUID: () => string,
): Result<Contact, Error> {
	const now = new Date().toISOString();
	const id = createContactId(generateUUID);

	const contact = contactModule.Contact({
		...data,
		id,
		createdAt: now,
		updatedAt: now,
	});

	if (contact instanceof ArkErrors) {
		return err(new Error("Contact validation failed", { cause: contact }));
	}

	return ok(contact);
}

export function updateContact(
	contact: Contact,
	updates: ContactForUpdate,
): Contact {
	return {
		...contact,
		...updates,
		updatedAt: new Date().toISOString(),
	};
}
