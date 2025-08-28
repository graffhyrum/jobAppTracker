import type { JobApplication } from "../../domain/entities/job-application";
import { createDefaultPipelineConfig } from "../../domain/entities/pipeline-config";
import { layout } from "../components/layout";
import { pipelineComponent } from "../components/pipeline";

export const homepagePage = (applications: JobApplication[] = []): string => {
	const pipelineConfig = createDefaultPipelineConfig();

	const content = `
		<div>
			<div class="page-header">
				<div class="header-content">
					<h1 data-testid="page-title">Job App Tracker</h1>
					<p>Welcome to your job application tracking system. Manage your applications through the pipeline below.</p>
				</div>
				<a href="/add" class="add-button">+ Add New Application</a>
			</div>
			
			${pipelineComponent(pipelineConfig, applications)}
		</div>

		<style>
			.page-header {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				margin-bottom: 24px;
				gap: 24px;
			}

			.header-content {
				flex: 1;
			}

			.header-content h1 {
				margin: 0 0 8px 0;
				color: #333;
			}

			.header-content p {
				margin: 0;
				color: #666;
				font-size: 16px;
			}

			.add-button {
				display: inline-flex;
				align-items: center;
				padding: 14px 24px;
				background-color: #4caf50;
				color: white;
				text-decoration: none;
				border-radius: 6px;
				font-weight: 600;
				font-size: 16px;
				transition: all 0.2s ease;
				white-space: nowrap;
				box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
			}

			.add-button:hover {
				background-color: #45a049;
				transform: translateY(-1px);
				box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
			}

			@media (max-width: 768px) {
				.page-header {
					flex-direction: column;
					align-items: stretch;
					gap: 16px;
				}

				.add-button {
					align-self: flex-start;
					font-size: 14px;
					padding: 12px 20px;
				}
			}
		</style>
	`;

	return layout("Job App Tracker", content);
};
