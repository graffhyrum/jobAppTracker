import { scope, type } from "arktype";
import { Either } from "effect";
import { Elysia, NotFoundError } from "elysia";

import { contactRepositoryPlugin } from "#src/application/server/plugins/contactRepository.plugin.ts";
import { runEffect } from "#src/application/server/utils/run-effect.ts";
import { uuidSchema } from "#src/domain/entities/uuid.ts";
import { escapeHtml } from "#src/presentation/utils/html-escape.ts";
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
			const result = await runEffect(
				contactRepository.getByJobApplicationId(appId),
			);

			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${escapeHtml(result.left.detail)}`;
			}

			set.headers["Content-Type"] = "text/html";
			return renderContactsList(result.right, appId);
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// GET /applications/:id/contacts/new - Returns a new contact form
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
	// POST /applications/:id/contacts - Create a new contact
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

			const result = await runEffect(contactRepository.create(contactData));

			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${escapeHtml(result.left.detail)}`;
			}

			// Return the updated list
			set.headers["Content-Type"] = "text/html";
			const contacts = await runEffect(
				contactRepository.getByJobApplicationId(appId),
			);
			return Either.isRight(contacts)
				? renderContactsList(contacts.right, appId)
				: `Error: ${escapeHtml(contacts.left.detail)}`;
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
			const result = await runEffect(contactRepository.getById(id));

			if (Either.isLeft(result)) {
				throw new NotFoundError(`Error: ${escapeHtml(result.left.detail)}`);
			}

			const contact = result.right;
			// Return just the contact card
			set.headers["Content-Type"] = "text/html";
			const contactsResult = await runEffect(
				contactRepository.getByJobApplicationId(contact.jobApplicationId),
			);
			return Either.isRight(contactsResult)
				? renderContactsList(contactsResult.right, contact.jobApplicationId)
				: `Error: ${escapeHtml(contactsResult.left.detail)}`;
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// GET /contacts/:id/edit - Returns an edit form for contact
	.get(
		"/contacts/:id/edit",
		async ({ contactRepository, params: { id }, set }) => {
			const result = await runEffect(contactRepository.getById(id));

			if (Either.isLeft(result)) {
				throw new NotFoundError(`Error: ${escapeHtml(result.left.detail)}`);
			}

			set.headers["Content-Type"] = "text/html";
			return renderContactForm(result.right.jobApplicationId, result.right);
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

			const result = await runEffect(contactRepository.update(id, updates));

			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${escapeHtml(result.left.detail)}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const contactsResult = await runEffect(
				contactRepository.getByJobApplicationId(result.right.jobApplicationId),
			);
			return Either.isRight(contactsResult)
				? renderContactsList(
						contactsResult.right,
						result.right.jobApplicationId,
					)
				: `Error: ${escapeHtml(contactsResult.left.detail)}`;
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
			const contactResult = await runEffect(contactRepository.getById(id));
			if (Either.isLeft(contactResult)) {
				set.status = 404;
				return `Error: ${escapeHtml(contactResult.left.detail)}`;
			}

			const jobAppId = contactResult.right.jobApplicationId;

			const result = await runEffect(contactRepository.delete(id));
			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${escapeHtml(result.left.detail)}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const contactsResult = await runEffect(
				contactRepository.getByJobApplicationId(jobAppId),
			);
			return Either.isRight(contactsResult)
				? renderContactsList(contactsResult.right, jobAppId)
				: `Error: ${escapeHtml(contactsResult.left.detail)}`;
		},
		{
			params: idParamSchema,
		},
	);
