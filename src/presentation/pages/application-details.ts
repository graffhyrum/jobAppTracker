import type { JobApplication } from "../../domain/entities/job-application";
import { renderApplicationDetailsView } from "../components/application-details-renderer";
import { type LayoutOptions, layout } from "../components/layout";

export const applicationDetailsPage = (
	app: JobApplication,
	layoutOptions: LayoutOptions = {},
): string => {
	const content = `
		<div class="application-details-page">
			${renderApplicationDetailsView(app)}
		</div>
	`;

	return layout(
		`${app.company} - ${app.positionTitle} | Job App Tracker`,
		content,
		layoutOptions,
	);
};
