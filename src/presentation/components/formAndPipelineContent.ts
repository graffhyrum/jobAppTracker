import type { JobApplication } from "../../domain/entities/job-application.ts";
import { addApplicationForm } from "./add-application-form.ts";
import { pipelineComponent } from "./pipeline.ts";

export function formAndPipelineContent(
	applications: JobApplication[] = [],
	errorMessage?: string,
): string {
	return `
		${pipelineComponent(applications)}
				<div id="form-container">
			<details ${errorMessage ? "open" : ""}>
				<summary data-testid="add-application-form-visibility-toggle">Add New Application</summary>
				${addApplicationForm(errorMessage)}
			</details>
		</div>
	`;
}
