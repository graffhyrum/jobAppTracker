import { addApplicationForm } from "../components/add-application-form";
import { layout } from "../components/layout";

export const addApplicationPage = (): string => {
	const content = `
		<script src="https://unpkg.com/htmx.org@1.9.10"></script>
		<div>
			<div class="page-header">
				<h1 data-testid="page-title">Add New Job Application</h1>
				<a href="/" class="back-button">← Back to Pipeline</a>
			</div>
			
			<div class="page-content">
				${addApplicationForm()}
			</div>
		</div>

		<style>
			.page-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 24px;
				padding-bottom: 16px;
				border-bottom: 2px solid #e0e0e0;
			}

			.page-header h1 {
				margin: 0;
				color: #333;
			}

			.back-button {
				display: inline-flex;
				align-items: center;
				padding: 10px 16px;
				background-color: #f5f5f5;
				color: #666;
				text-decoration: none;
				border-radius: 6px;
				border: 2px solid #e0e0e0;
				font-weight: 500;
				transition: all 0.2s ease;
			}

			.back-button:hover {
				background-color: #eeeeee;
				border-color: #d0d0d0;
				color: #333;
			}

			.page-content {
				max-width: 800px;
			}

			@media (max-width: 768px) {
				.page-header {
					flex-direction: column;
					gap: 12px;
					align-items: flex-start;
				}

				.back-button {
					align-self: flex-start;
				}
			}
		</style>
	`;

	return layout("Add Job Application", content);
};
