import { type NavbarOptions, navbar } from "./navbar";

export type LayoutOptions = {
	navbar?: NavbarOptions;
};

export const layout = (
	title: string,
	content: string,
	options: LayoutOptions = {},
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
	<title>${title}</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.6/dist/htmx.min.js"></script>
	<link rel="stylesheet" href="/styles/base.css">
	<link rel="stylesheet" href="/styles/navbar.css">
	<link rel="stylesheet" href="/styles/forms.css">
	<link rel="stylesheet" href="/styles/pages.css">
	<link rel="stylesheet" href="/styles/pipeline.css">
	<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
	<link rel="alternate icon" href="/assets/favicon.svg" type="image/svg+xml">
</head>
<body>
	${navbar(options.navbar)}
	<div class="main-content">
		${content}
	</div>
</body>
</html>`;
