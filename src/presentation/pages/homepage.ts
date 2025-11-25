import type { JobApplication } from "../../domain/entities/job-application";
import type { JobBoard } from "../../domain/entities/job-board.ts";
import { formAndPipelineContent } from "../components/formAndPipelineContent.ts";
import { type LayoutOptions, layout } from "../components/layout";

export const homepagePage = (
	applications: JobApplication[] = [],
	jobBoards: JobBoard[] = [],
	layoutOptions: LayoutOptions = {},
): string => {
	const content = `
		<div class="homepage">
			<div class="page-header">
				<div class="header-content">
					<h1 data-testid="page-title">Job App Tracker</h1>
					<p>Welcome to your job application tracking system. Add new applications below and manage them through the pipeline.</p>
				</div>
			</div>

			<div id="form-and-pipeline-container">
				${formAndPipelineContent(applications, jobBoards)}
			</div>
		</div>
	`;

	return layout("Job App Tracker", content, layoutOptions);
};
