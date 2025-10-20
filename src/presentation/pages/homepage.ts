import { processEnv } from "../../../processEnvFacade.ts";
import type { JobApplication } from "../../domain/entities/job-application";
import { formAndPipelineContent } from "../components/formAndPipelineContent.ts";
import { layout } from "../components/layout";

export const homepagePage = (applications: JobApplication[] = []): string => {
	const content = `
		<div class="homepage">
			<div class="page-header">
				<div class="header-content">
					<h1 data-testid="page-title">Job App Tracker</h1>
					<p>Welcome to your job application tracking system. Add new applications below and manage them through the pipeline.</p>
					<p>JOB_APP_MANAGER_TYPE: ${processEnv.JOB_APP_MANAGER_TYPE}</p>
				</div>
			</div>
			
			<div id="form-and-pipeline-container">
				${formAndPipelineContent(applications)}
			</div>
		</div>
	`;

	return layout("Job App Tracker", content);
};
