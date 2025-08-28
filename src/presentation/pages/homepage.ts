import type { JobApplication } from "../../domain/entities/job-application";
import { createDefaultPipelineConfig } from "../../domain/entities/pipeline-config";
import { layout } from "../components/layout";
import { pipelineComponent } from "../components/pipeline";

export const homepagePage = (applications: JobApplication[] = []): string => {
	const pipelineConfig = createDefaultPipelineConfig();

	const content = `
		<div class="homepage">
			<div class="page-header">
				<div class="header-content">
					<h1 data-testid="page-title">Job App Tracker</h1>
					<p>Welcome to your job application tracking system. Manage your applications through the pipeline below.</p>
				</div>
				<a href="/add" class="add-button">+ Add New Application</a>
			</div>
			
			${pipelineComponent(pipelineConfig, applications)}
		</div>
	`;

	return layout("Job App Tracker", content);
};
