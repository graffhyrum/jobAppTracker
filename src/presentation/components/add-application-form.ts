import type { JobBoard } from "../../domain/entities/job-board.ts";

export function addApplicationForm(
	jobBoards: JobBoard[] = [],
	errorMessage?: string,
): string {
	return `
		<div class="add-application-container">
			${
				errorMessage
					? `<div class="error-message" style="color: red; padding: 10px; margin-bottom: 20px; border: 1px solid red; border-radius: 4px; background-color: #ffebee;">${errorMessage}</div>`
					: ""
			}
			<form
				hx-post="/applications"
				hx-trigger="submit"
				hx-target="#form-and-pipeline-container"
				hx-swap="innerHTML"
				class="add-application-form"
			>
				<div class="form-group">
					<label for="company">Company*</label>
					<input
						type="text"
						id="company"
						name="company"
						required
						placeholder="Enter company name"
					>
				</div>

				<div class="form-group">
					<label for="positionTitle">Position Title*</label>
					<input
						type="text"
						id="positionTitle"
						name="positionTitle"
						required
						placeholder="Enter position title"
					>
				</div>

				<div class="form-group">
					<label for="applicationDate">Application Date*</label>
					<input
						type="date"
						id="applicationDate"
						name="applicationDate"
						required
						value="${new Date().toISOString().split("T")[0]}"
					>
				</div>

				<div class="form-group">
					<label for="sourceType">Source*</label>
					<select id="sourceType" name="sourceType" required>
						<option value="other">Other</option>
						<option value="job_board">Job Board</option>
						<option value="referral">Referral</option>
						<option value="company_website">Company Website</option>
						<option value="recruiter">Recruiter</option>
						<option value="networking">Networking</option>
					</select>
				</div>

				<div class="form-group" id="jobBoardGroup" style="display: none;">
					<label for="jobBoardId">Job Board</label>
					<select id="jobBoardId" name="jobBoardId">
						<option value="">Select a job board</option>
						${jobBoards.map((board) => `<option value="${board.id}">${board.name}</option>`).join("")}
					</select>
				</div>

				<div class="form-group">
					<label>
						<input
							type="checkbox"
							id="isRemote"
							name="isRemote"
							value="true"
						>
						Remote Position
					</label>
				</div>

				<div class="form-group">
					<label for="sourceNotes">Source Notes</label>
					<textarea
						id="sourceNotes"
						name="sourceNotes"
						rows="2"
						placeholder="How did you find this job? (optional)"
					></textarea>
				</div>

				<div class="form-group">
					<label for="interestRating">Interest Rating</label>
					<select id="interestRating" name="interestRating">
						<option value="">Select rating (optional)</option>
						<option value="1">1 - Low Interest</option>
						<option value="2">2 - Medium Interest</option>
						<option value="3">3 - High Interest</option>
					</select>
				</div>

				<div class="form-group">
					<label for="nextEventDate">Next Event Date</label>
					<input
						type="date"
						id="nextEventDate"
						name="nextEventDate"
						placeholder="Optional"
					>
				</div>

				<div class="form-group">
					<label for="jobPostingUrl">Job Posting URL</label>
					<input
						type="url"
						id="jobPostingUrl"
						name="jobPostingUrl"
						placeholder="https://example.com/job-posting"
					>
				</div>

				<div class="form-group">
					<label for="jobDescription">Job Description</label>
					<textarea
						id="jobDescription"
						name="jobDescription"
						rows="4"
						placeholder="Enter job description (optional)"
					></textarea>
				</div>

				<div class="form-actions">
					<button type="submit" class="btn-primary">Add Application</button>
					<button type="reset" class="btn-secondary">Clear Form</button>
				</div>
			</form>

			<script>
				// Toggle job board dropdown visibility based on source type
				const sourceTypeSelect = document.getElementById('sourceType');
				const jobBoardGroup = document.getElementById('jobBoardGroup');
				const jobBoardSelect = document.getElementById('jobBoardId');

				sourceTypeSelect?.addEventListener('change', (e) => {
					const value = e.target.value;
					if (value === 'job_board') {
						jobBoardGroup.style.display = 'block';
					} else {
						jobBoardGroup.style.display = 'none';
						jobBoardSelect.value = '';
					}
				});
			</script>
		</div>
	`;
}
