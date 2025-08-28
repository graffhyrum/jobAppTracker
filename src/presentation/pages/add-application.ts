import { addApplicationForm } from "../components/add-application-form";
import { layout } from "../components/layout";

export const addApplicationPage = (): string => {
	const content = `
		<script src="https://unpkg.com/htmx.org@1.9.10"></script>
		<div class="add-application-page">
			<div class="page-header">
				<h1 data-testid="page-title">Add New Job Application</h1>
				<a href="/" class="back-button">← Back to Pipeline</a>
			</div>
			
			<div class="page-content">
				${addApplicationForm()}
			</div>
		</div>
	`;

	return layout("Add Job Application", content);
};
