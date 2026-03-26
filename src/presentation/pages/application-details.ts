import type { JobApplication } from "../../domain/entities/job-application";
import { renderApplicationDetailsView } from "../components/application-details-renderer";
import { type LayoutOptions, layout } from "../components/layout";
import { escapeHtml } from "../utils/html-escape";

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
		`${escapeHtml(app.company)} - ${escapeHtml(app.positionTitle)} | Job App Tracker`,
		content,
		layoutOptions,
	);
};
