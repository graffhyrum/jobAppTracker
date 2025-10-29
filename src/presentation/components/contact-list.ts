import type { Contact } from "../../domain/entities/contact.ts";
import type { JobApplicationId } from "../../domain/entities/job-application.ts";
import { formatDate } from "../utils/pipeline-utils.ts";

const roleLabels: Record<string, string> = {
	recruiter: "👔 Recruiter",
	"hiring manager": "💼 Hiring Manager",
	employee: "👤 Employee",
	referral: "🤝 Referral",
	other: "📋 Other",
};

const channelLabels: Record<string, string> = {
	email: "📧 Email",
	linkedin: "💼 LinkedIn",
	phone: "📞 Phone",
	referral: "🤝 Referral",
	other: "📋 Other",
};

export function renderContactsList(
	contacts: Contact[],
	jobApplicationId: JobApplicationId,
): string {
	if (contacts.length === 0) {
		return `
			<div class="contacts-section" data-testid="contacts-section">
				<h2>Contacts & Networking</h2>
				<p class="empty-state">No contacts recorded yet.</p>
				<button
					type="button"
					class="action-btn add"
					data-testid="add-contact-btn"
					hx-get="/applications/${jobApplicationId}/contacts/new"
					hx-target="#contacts-list"
					hx-swap="afterbegin"
					title="Add Contact">+ Add Contact</button>
			</div>
		`;
	}

	const contactsHtml = contacts
		.map(
			(contact) => `
		<div class="contact-card" data-testid="contact-${contact.id}">
			<div class="contact-header">
				<div class="contact-info-section">
					<div class="contact-name">${contact.contactName}</div>
					<div class="contact-badges">
						${contact.role ? `<span class="role-badge">${roleLabels[contact.role] || contact.role}</span>` : ""}
						<span class="channel-badge">${channelLabels[contact.channel] || contact.channel}</span>
						<span class="response-badge ${contact.responseReceived ? "received" : "no-response"}">
							${contact.responseReceived ? "✓ Response Received" : "⏳ No Response"}
						</span>
					</div>
				</div>
				<div class="stage-actions">
					<button
						type="button"
						class="action-btn-small edit"
						data-testid="edit-contact-btn-${contact.id}"
						hx-get="/contacts/${contact.id}/edit"
						hx-target="#contact-${contact.id}"
						hx-swap="outerHTML"
						title="Edit">✏️</button>
					<button
						type="button"
						class="action-btn-small delete"
						data-testid="delete-contact-btn-${contact.id}"
						hx-delete="/contacts/${contact.id}"
						hx-confirm="Are you sure you want to delete this contact?"
						hx-target="#contact-${contact.id}"
						hx-swap="outerHTML"
						title="Delete">🗑️</button>
				</div>
			</div>
			<div class="contact-details">
				<div class="contact-info">
					<label>Outreach Date:</label>
					<span data-utc="${contact.outreachDate}">${formatDate(contact.outreachDate)}</span>
				</div>
				${
					contact.contactEmail
						? `<div class="contact-info">
					<label>Email:</label>
					<a href="mailto:${contact.contactEmail}">${contact.contactEmail}</a>
				</div>`
						: ""
				}
				${
					contact.linkedInUrl
						? `<div class="contact-info">
					<label>LinkedIn:</label>
					<a href="${contact.linkedInUrl}" target="_blank" rel="noopener noreferrer">View Profile</a>
				</div>`
						: ""
				}
			</div>
			${
				contact.notes
					? `<div class="contact-notes">
				<label>Notes:</label>
				<p>${contact.notes}</p>
			</div>`
					: ""
			}
		</div>
	`,
		)
		.join("");

	return `
		<div class="contacts-section" data-testid="contacts-section">
			<div class="section-header">
				<h2>Contacts & Networking (${contacts.length})</h2>
				<button
					type="button"
					class="action-btn add"
					data-testid="add-contact-btn"
					hx-get="/applications/${jobApplicationId}/contacts/new"
					hx-target="#contacts-list"
					hx-swap="afterbegin"
					title="Add Contact">+ Add Contact</button>
			</div>
			<div id="contacts-list" class="contacts-list">
				${contactsHtml}
			</div>
		</div>
	`;
}

export function renderContactForm(
	jobApplicationId: JobApplicationId,
	contact?: Contact,
): string {
	const isEdit = !!contact;
	const formId = isEdit ? `edit-contact-${contact.id}` : "new-contact";
	const targetUrl = isEdit
		? `/contacts/${contact.id}`
		: `/applications/${jobApplicationId}/contacts`;
	const method = isEdit ? "put" : "post";

	const outreachValue = contact?.outreachDate
		? contact.outreachDate.split("T")[0]
		: new Date().toISOString().split("T")[0];

	return `
		<div class="contact-form" id="contact-${contact?.id || "new"}" data-testid="contact-form-${formId}">
			<form id="${formId}">
				<div class="form-row">
					<div class="form-field">
						<label for="${formId}-name">Contact Name *</label>
						<input
							id="${formId}-name"
							type="text"
							name="contactName"
							value="${contact?.contactName || ""}"
							class="form-input"
							data-testid="input-contactName"
							required
							autofocus />
					</div>
					<div class="form-field">
						<label for="${formId}-email">Email</label>
						<input
							id="${formId}-email"
							type="email"
							name="contactEmail"
							value="${contact?.contactEmail || ""}"
							class="form-input"
							data-testid="input-contactEmail"
							placeholder="contact@example.com" />
					</div>
				</div>

				<div class="form-row">
					<div class="form-field">
						<label for="${formId}-linkedin">LinkedIn URL</label>
						<input
							id="${formId}-linkedin"
							type="url"
							name="linkedInUrl"
							value="${contact?.linkedInUrl || ""}"
							class="form-input"
							data-testid="input-linkedInUrl"
							placeholder="https://linkedin.com/in/..." />
					</div>
					<div class="form-field">
						<label for="${formId}-role">Role</label>
						<select
							id="${formId}-role"
							name="role"
							class="form-select"
							data-testid="select-role">
							<option value="">Select role...</option>
							<option value="recruiter" ${contact?.role === "recruiter" ? "selected" : ""}>Recruiter</option>
							<option value="hiring manager" ${contact?.role === "hiring manager" ? "selected" : ""}>Hiring Manager</option>
							<option value="employee" ${contact?.role === "employee" ? "selected" : ""}>Employee</option>
							<option value="referral" ${contact?.role === "referral" ? "selected" : ""}>Referral</option>
							<option value="other" ${contact?.role === "other" ? "selected" : ""}>Other</option>
						</select>
					</div>
				</div>

				<div class="form-row">
					<div class="form-field">
						<label for="${formId}-channel">Contact Channel *</label>
						<select
							id="${formId}-channel"
							name="channel"
							class="form-select"
							data-testid="select-channel"
							required>
							<option value="">Select channel...</option>
							<option value="email" ${contact?.channel === "email" ? "selected" : ""}>Email</option>
							<option value="linkedin" ${contact?.channel === "linkedin" ? "selected" : ""}>LinkedIn</option>
							<option value="phone" ${contact?.channel === "phone" ? "selected" : ""}>Phone</option>
							<option value="referral" ${contact?.channel === "referral" ? "selected" : ""}>Referral</option>
							<option value="other" ${contact?.channel === "other" ? "selected" : ""}>Other</option>
						</select>
					</div>
					<div class="form-field">
						<label for="${formId}-outreach">Outreach Date *</label>
						<input
							id="${formId}-outreach"
							type="date"
							name="outreachDate"
							value="${outreachValue}"
							class="form-input"
							data-testid="input-outreachDate"
							required />
					</div>
				</div>

				<div class="form-field">
					<label for="${formId}-response">
						<input
							id="${formId}-response"
							type="checkbox"
							name="responseReceived"
							${contact?.responseReceived ? "checked" : ""}
							data-testid="checkbox-responseReceived" />
						Response Received
					</label>
				</div>

				<div class="form-field">
					<label for="${formId}-notes">Notes</label>
					<textarea
						id="${formId}-notes"
						name="notes"
						rows="4"
						class="form-textarea"
						data-testid="textarea-notes"
						placeholder="Additional notes about this contact...">${contact?.notes || ""}</textarea>
				</div>

				<div class="form-actions">
					<button
						type="button"
						class="action-btn save"
						data-testid="save-contact-btn"
						hx-${method}="${targetUrl}"
						hx-include="#${formId}"
						hx-target="#contact-${contact?.id || "new"}"
						hx-swap="outerHTML"
						title="Save">💾 Save</button>
					<button
						type="button"
						class="action-btn cancel"
						data-testid="cancel-contact-btn"
						${
							isEdit
								? `hx-get="/contacts/${contact.id}"`
								: `onclick="document.getElementById('contact-new').remove()"`
						}
						${isEdit ? `hx-target="#contact-${contact.id}"` : ""}
						${isEdit ? 'hx-swap="outerHTML"' : ""}
						title="Cancel">✖ Cancel</button>
				</div>
			</form>
		</div>
	`;
}
