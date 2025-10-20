export function addApplicationForm(errorMessage?: string): string {
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
		</div>
	`;
}
