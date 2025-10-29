import type { InterviewStage } from "../../domain/entities/interview-stage.ts";
import type { JobApplicationId } from "../../domain/entities/job-application.ts";
import { formatDate } from "../utils/pipeline-utils.ts";

const interviewTypeLabels: Record<string, string> = {
	"phone screening": "📞 Phone Screening",
	technical: "💻 Technical",
	behavioral: "🗣️ Behavioral",
	onsite: "🏢 Onsite",
	panel: "👥 Panel",
	other: "📋 Other",
};

export function renderInterviewStagesList(
	stages: InterviewStage[],
	jobApplicationId: JobApplicationId,
): string {
	if (stages.length === 0) {
		return `
			<div class="interview-stages-section" data-testid="interview-stages-section">
				<h2>Interview Stages</h2>
				<p class="empty-state">No interview stages recorded yet.</p>
				<button
					type="button"
					class="action-btn add"
					data-testid="add-interview-stage-btn"
					hx-get="/applications/${jobApplicationId}/interview-stages/new"
					hx-target="#interview-stages-list"
					hx-swap="afterbegin"
					title="Add Interview Stage">+ Add Interview Stage</button>
			</div>
		`;
	}

	const stagesHtml = stages
		.map(
			(stage) => `
		<div class="interview-stage-card" data-testid="interview-stage-${stage.id}">
			<div class="stage-header">
				<div class="stage-title">
					<span class="stage-round">Round ${stage.round}</span>
					<span class="stage-type">${interviewTypeLabels[stage.interviewType] || stage.interviewType}</span>
					${stage.isFinalRound ? '<span class="final-round-badge">Final Round</span>' : ""}
				</div>
				<div class="stage-actions">
					<button
						type="button"
						class="action-btn-small edit"
						data-testid="edit-stage-btn-${stage.id}"
						hx-get="/interview-stages/${stage.id}/edit"
						hx-target="#interview-stage-${stage.id}"
						hx-swap="outerHTML"
						title="Edit">✏️</button>
					<button
						type="button"
						class="action-btn-small delete"
						data-testid="delete-stage-btn-${stage.id}"
						hx-delete="/interview-stages/${stage.id}"
						hx-confirm="Are you sure you want to delete this interview stage?"
						hx-target="#interview-stage-${stage.id}"
						hx-swap="outerHTML"
						title="Delete">🗑️</button>
				</div>
			</div>
			<div class="stage-details">
				<div class="stage-dates">
					${
						stage.scheduledDate
							? `<div class="stage-date">
						<label>Scheduled:</label>
						<span data-utc="${stage.scheduledDate}">${formatDate(stage.scheduledDate)}</span>
					</div>`
							: ""
					}
					${
						stage.completedDate
							? `<div class="stage-date">
						<label>Completed:</label>
						<span data-utc="${stage.completedDate}">${formatDate(stage.completedDate)}</span>
					</div>`
							: ""
					}
				</div>
				${
					stage.notes
						? `<div class="stage-notes">
					<label>Notes:</label>
					<p>${stage.notes}</p>
				</div>`
						: ""
				}
				${
					stage.questions.length > 0
						? `
					<details class="stage-questions" data-testid="questions-${stage.id}">
						<summary>Questions (${stage.questions.length})</summary>
						<div class="questions-list">
							${stage.questions
								.map(
									(q) => `
								<div class="question-item">
									<div class="question-title">${q.title}</div>
									${q.answer ? `<div class="question-answer">${q.answer}</div>` : '<div class="question-answer no-answer">No answer recorded</div>'}
								</div>
							`,
								)
								.join("")}
						</div>
					</details>
				`
						: ""
				}
			</div>
		</div>
	`,
		)
		.join("");

	return `
		<div class="interview-stages-section" data-testid="interview-stages-section">
			<div class="section-header">
				<h2>Interview Stages (${stages.length})</h2>
				<button
					type="button"
					class="action-btn add"
					data-testid="add-interview-stage-btn"
					hx-get="/applications/${jobApplicationId}/interview-stages/new"
					hx-target="#interview-stages-list"
					hx-swap="afterbegin"
					title="Add Interview Stage">+ Add Interview Stage</button>
			</div>
			<div id="interview-stages-list" class="interview-stages-list">
				${stagesHtml}
			</div>
		</div>
	`;
}

export function renderInterviewStageForm(
	jobApplicationId: JobApplicationId,
	stage?: InterviewStage,
): string {
	const isEdit = !!stage;
	const formId = isEdit ? `edit-stage-${stage.id}` : "new-stage";
	const targetUrl = isEdit
		? `/interview-stages/${stage.id}`
		: `/applications/${jobApplicationId}/interview-stages`;
	const method = isEdit ? "put" : "post";

	const scheduledValue = stage?.scheduledDate
		? stage.scheduledDate.split("T")[0]
		: "";
	const completedValue = stage?.completedDate
		? stage.completedDate.split("T")[0]
		: "";

	const questionsList =
		stage?.questions?.map((q, idx) => ({ ...q, tempId: idx })) || [];

	return `
		<div class="interview-stage-form" id="interview-stage-${stage?.id || "new"}" data-testid="interview-stage-form-${formId}">
			<form id="${formId}">
				<div class="form-row">
					<div class="form-field">
						<label for="${formId}-round">Round</label>
						<input
							id="${formId}-round"
							type="number"
							name="round"
							value="${stage?.round || ""}"
							min="1"
							class="form-input"
							data-testid="input-round"
							required />
					</div>
					<div class="form-field">
						<label for="${formId}-type">Interview Type</label>
						<select
							id="${formId}-type"
							name="interviewType"
							class="form-select"
							data-testid="select-interviewType"
							required>
							<option value="">Select type...</option>
							<option value="phone screening" ${stage?.interviewType === "phone screening" ? "selected" : ""}>Phone Screening</option>
							<option value="technical" ${stage?.interviewType === "technical" ? "selected" : ""}>Technical</option>
							<option value="behavioral" ${stage?.interviewType === "behavioral" ? "selected" : ""}>Behavioral</option>
							<option value="onsite" ${stage?.interviewType === "onsite" ? "selected" : ""}>Onsite</option>
							<option value="panel" ${stage?.interviewType === "panel" ? "selected" : ""}>Panel</option>
							<option value="other" ${stage?.interviewType === "other" ? "selected" : ""}>Other</option>
						</select>
					</div>
				</div>

				<div class="form-row">
					<div class="form-field">
						<label for="${formId}-scheduled">Scheduled Date</label>
						<input
							id="${formId}-scheduled"
							type="date"
							name="scheduledDate"
							value="${scheduledValue}"
							class="form-input"
							data-testid="input-scheduledDate" />
					</div>
					<div class="form-field">
						<label for="${formId}-completed">Completed Date</label>
						<input
							id="${formId}-completed"
							type="date"
							name="completedDate"
							value="${completedValue}"
							class="form-input"
							data-testid="input-completedDate" />
					</div>
				</div>

				<div class="form-field">
					<label for="${formId}-final">
						<input
							id="${formId}-final"
							type="checkbox"
							name="isFinalRound"
							${stage?.isFinalRound ? "checked" : ""}
							data-testid="checkbox-isFinalRound" />
						Final Round
					</label>
				</div>

				<div class="form-field">
					<label for="${formId}-notes">Notes</label>
					<textarea
						id="${formId}-notes"
						name="notes"
						rows="3"
						class="form-textarea"
						data-testid="textarea-notes"
						placeholder="Interview notes...">${stage?.notes || ""}</textarea>
				</div>

				<div class="form-field">
					<label>Questions</label>
					<div id="${formId}-questions-list" class="questions-form-list">
						${questionsList
							.map(
								(q, idx) => `
							<div class="question-form-item" data-question-id="${idx}">
								<input type="text" name="questions[${idx}][title]" value="${q.title}" placeholder="Question" class="form-input" required />
								<textarea name="questions[${idx}][answer]" placeholder="Answer (optional)" class="form-textarea" rows="2">${q.answer || ""}</textarea>
								<button type="button" class="btn-remove-question" onclick="this.parentElement.remove()">✖</button>
							</div>
						`,
							)
							.join("")}
					</div>
					<button
						type="button"
						class="action-btn-small add"
						onclick="addQuestionField('${formId}')"
						data-testid="add-question-btn">+ Add Question</button>
				</div>

				<div class="form-actions">
					<button
						type="button"
						class="action-btn save"
						data-testid="save-stage-btn"
						hx-${method}="${targetUrl}"
						hx-include="#${formId}"
						hx-target="#interview-stage-${stage?.id || "new"}"
						hx-swap="outerHTML"
						title="Save">💾 Save</button>
					<button
						type="button"
						class="action-btn cancel"
						data-testid="cancel-stage-btn"
						${
							isEdit
								? `hx-get="/interview-stages/${stage.id}"`
								: `onclick="document.getElementById('interview-stage-new').remove()"`
						}
						${isEdit ? `hx-target="#interview-stage-${stage.id}"` : ""}
						${isEdit ? 'hx-swap="outerHTML"' : ""}
						title="Cancel">✖ Cancel</button>
				</div>
			</form>
		</div>

		<script>
			function addQuestionField(formId) {
				const list = document.getElementById(formId + '-questions-list');
				const count = list.children.length;
				const div = document.createElement('div');
				div.className = 'question-form-item';
				div.dataset.questionId = count;
				div.innerHTML = \`
					<input type="text" name="questions[\${count}][title]" placeholder="Question" class="form-input" required />
					<textarea name="questions[\${count}][answer]" placeholder="Answer (optional)" class="form-textarea" rows="2"></textarea>
					<button type="button" class="btn-remove-question" onclick="this.parentElement.remove()">✖</button>
				\`;
				list.appendChild(div);
			}
		</script>
	`;
}
