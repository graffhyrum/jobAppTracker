import { layout } from "../components/layout";

export const homepagePage = (): string => {
	const content = `
		<div>
			<h1>Job App Tracker</h1>
			<p>Hi</p>
		</div>
	`;

	return layout("Job App Tracker", content);
};
