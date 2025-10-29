import { scope, type } from "arktype";
import { Elysia, NotFoundError } from "elysia";
import { contactRepositoryPlugin } from "#src/application/server/plugins/contactRepository.plugin.ts";
import { uuidSchema } from "#src/domain/entities/uuid.ts";
import {
	renderContactForm,
	renderContactsList,
} from "#src/presentation/components/contact-list.ts";

// Schemas for route params and body
const idParamSchema = type({
	id: uuidSchema,
});

const formDataScope = scope({
	FormData: {
		contactName: "string > 0",
		"contactEmail?": "string.email | ''",
		"linkedInUrl?": "string.url | ''",
		"role?": "'recruiter'|'hiring manager'|'employee'|'referral'|'other'|''",
		channel: "'email'|'linkedin'|'phone'|'referral'|'other'",
		outreachDate: "string.date.iso",
		"responseReceived?": "boolean",
		"notes?": "string",
	},
});

const formDataSchema = formDataScope.export();

export const createContactsPlugin = new Elysia({ prefix: "/applications" })
	.use(contactRepositoryPlugin)
	// GET /applications/:id/contacts - List all contacts for application
	.get(
		"/:id/contacts",
		async ({ contactRepository, params: { id: appId }, set }) => {
			const result = await contactRepository.getByJobApplicationId(appId);

			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			set.headers["Content-Type"] = "text/html";
			return renderContactsList(result.value, appId);
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// GET /applications/:id/contacts/new - Returns new contact form
	.get(
		"/:id/contacts/new",
		async ({ params: { id: appId }, set }) => {
			set.headers["Content-Type"] = "text/html";
			return renderContactForm(appId);
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// POST /applications/:id/contacts - Create new contact
	.post(
		"/:id/contacts",
		async ({ contactRepository, params: { id: appId }, body, set }) => {
			// Transform form data to domain entity
			const contactData = {
				jobApplicationId: appId,
				contactName: body.contactName,
				contactEmail: body.contactEmail || undefined,
				linkedInUrl: body.linkedInUrl || undefined,
				role: body.role || undefined,
				channel: body.channel,
				outreachDate: body.outreachDate,
				responseReceived: body.responseReceived ?? false,
				notes: body.notes,
			};

			const result = await contactRepository.create(contactData);

			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			// Return the updated list
			set.headers["Content-Type"] = "text/html";
			const contacts = await contactRepository.getByJobApplicationId(appId);
			return contacts.isOk()
				? renderContactsList(contacts.value, appId)
				: `Error: ${contacts.error}`;
		},
		{
			params: idParamSchema,
			body: formDataSchema.FormData,
		},
	);

// Separate plugin for contact operations (not prefixed by /applications)
export const createContactOperationsPlugin = new Elysia()
	.use(contactRepositoryPlugin)
	// GET /contacts/:id - Get single contact (for display after cancel)
	.get(
		"/contacts/:id",
		async ({ contactRepository, params: { id }, set }) => {
			const result = await contactRepository.getById(id);

			if (result.isErr()) {
				throw new NotFoundError(`Error: ${result.error}`);
			}

			const contact = result.value;
			// Return just the contact card
			set.headers["Content-Type"] = "text/html";
			const contactsResult = await contactRepository.getByJobApplicationId(
				contact.jobApplicationId,
			);
			return contactsResult.isOk()
				? renderContactsList(contactsResult.value, contact.jobApplicationId)
				: `Error: ${contactsResult.error}`;
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// GET /contacts/:id/edit - Returns edit form for contact
	.get(
		"/contacts/:id/edit",
		async ({ contactRepository, params: { id }, set }) => {
			const result = await contactRepository.getById(id);

			if (result.isErr()) {
				throw new NotFoundError(`Error: ${result.error}`);
			}

			set.headers["Content-Type"] = "text/html";
			return renderContactForm(result.value.jobApplicationId, result.value);
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// PUT /contacts/:id - Update contact
	.put(
		"/contacts/:id",
		async ({ contactRepository, params: { id }, body, set }) => {
			// Transform form data
			const updates = {
				contactName: body.contactName,
				contactEmail: body.contactEmail || undefined,
				linkedInUrl: body.linkedInUrl || undefined,
				role: body.role || undefined,
				channel: body.channel,
				outreachDate: body.outreachDate,
				responseReceived: body.responseReceived ?? false,
				notes: body.notes,
			};

			const result = await contactRepository.update(id, updates);

			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const contactsResult = await contactRepository.getByJobApplicationId(
				result.value.jobApplicationId,
			);
			return contactsResult.isOk()
				? renderContactsList(
						contactsResult.value,
						result.value.jobApplicationId,
					)
				: `Error: ${contactsResult.error}`;
		},
		{
			params: idParamSchema,
			body: formDataSchema.FormData,
		},
	)
	// DELETE /contacts/:id - Delete contact
	.delete(
		"/contacts/:id",
		async ({ contactRepository, params: { id }, set }) => {
			// Get the contact first to know the job application ID
			const contactResult = await contactRepository.getById(id);
			if (contactResult.isErr()) {
				set.status = 404;
				return `Error: ${contactResult.error}`;
			}

			const jobAppId = contactResult.value.jobApplicationId;

			const result = await contactRepository.delete(id);
			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const contactsResult =
				await contactRepository.getByJobApplicationId(jobAppId);
			return contactsResult.isOk()
				? renderContactsList(contactsResult.value, jobAppId)
				: `Error: ${contactsResult.error}`;
		},
		{
			params: idParamSchema,
		},
	);
