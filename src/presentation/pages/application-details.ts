import type { JobApplication } from "../../domain/entities/job-application";
import { renderApplicationDetailsView } from "../components/application-details-renderer";
import { layout } from "../components/layout";

export const applicationDetailsPage = (app: JobApplication): string => {
	const content = `
		<div class="application-details-page">
			${renderApplicationDetailsView(app)}
		</div>
	`;

	return layout(
		`${app.company} - ${app.positionTitle} | Job App Tracker`,
		content,
	);
};
