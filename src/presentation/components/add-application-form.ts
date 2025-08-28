export const addApplicationForm = (): string => {
	return `
		<div class="add-application-container">
			<h3>Add New Application</h3>
			<form 
				hx-post="/applications" 
				hx-trigger="submit"
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

		<style>
			.add-application-container {
				background: white;
				border-radius: 8px;
				padding: 24px;
				margin: 20px 0;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			}

			.add-application-container h3 {
				margin-top: 0;
				margin-bottom: 20px;
				color: #333;
				border-bottom: 2px solid #e0e0e0;
				padding-bottom: 8px;
			}

			.add-application-form {
				display: grid;
				gap: 16px;
			}

			.form-group {
				display: flex;
				flex-direction: column;
			}

			.form-group label {
				font-weight: 600;
				margin-bottom: 6px;
				color: #333;
			}

			.form-group input,
			.form-group select,
			.form-group textarea {
				padding: 10px 12px;
				border: 2px solid #e0e0e0;
				border-radius: 4px;
				font-size: 14px;
				transition: border-color 0.2s ease;
			}

			.form-group input:focus,
			.form-group select:focus,
			.form-group textarea:focus {
				outline: none;
				border-color: #4caf50;
				box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
			}

			.form-group input[required] + label::after,
			.form-group label[for="company"]::after,
			.form-group label[for="positionTitle"]::after,
			.form-group label[for="applicationDate"]::after {
				content: " *";
				color: #f44336;
			}

			.form-actions {
				display: flex;
				gap: 12px;
				margin-top: 8px;
			}

			.btn-primary,
			.btn-secondary {
				padding: 12px 24px;
				border-radius: 4px;
				font-weight: 600;
				border: none;
				cursor: pointer;
				transition: all 0.2s ease;
			}

			.btn-primary {
				background-color: #4caf50;
				color: white;
			}

			.btn-primary:hover {
				background-color: #45a049;
				transform: translateY(-1px);
				box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
			}

			.btn-secondary {
				background-color: #f5f5f5;
				color: #666;
				border: 2px solid #e0e0e0;
			}

			.btn-secondary:hover {
				background-color: #eeeeee;
				border-color: #d0d0d0;
			}

			@media (max-width: 768px) {
				.form-actions {
					flex-direction: column;
				}
			}
		</style>
	`;
};
