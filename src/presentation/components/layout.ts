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
	<link rel="stylesheet" href="/styles/themes.css">
	<link rel="stylesheet" href="/styles/base.css">
	<link rel="stylesheet" href="/styles/utilities.css">
	<link rel="stylesheet" href="/styles/buttons.css">
	<link rel="stylesheet" href="/styles/badges.css">
	<link rel="stylesheet" href="/styles/cards.css">
	<link rel="stylesheet" href="/styles/tables.css">
	<link rel="stylesheet" href="/styles/navbar.css">
	<link rel="stylesheet" href="/styles/forms.css">
	<link rel="stylesheet" href="/styles/pages.css">
	<link rel="stylesheet" href="/styles/pipeline.css">
	<link rel="stylesheet" href="/styles/analytics.css">
	<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
	<link rel="alternate icon" href="/assets/favicon.svg" type="image/svg+xml">
	<script>
		// Early theme application to prevent flash
		(function() {
			const THEME_STORAGE_KEY = "job-app-tracker-theme";
			const DARK_THEME = "dark";
			const LIGHT_THEME = "light";
			
			function getInitialTheme() {
				const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
				if (storedTheme === DARK_THEME || storedTheme === LIGHT_THEME) {
					return storedTheme;
				}
				if (globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches) {
					return DARK_THEME;
				}
				return LIGHT_THEME;
			}
			
			function applyTheme(theme) {
				document.documentElement.dataset.theme = theme;
			}
			
			applyTheme(getInitialTheme());
		})();
	</script>
</head>
<body>
	${navbar(options.navbar)}
	<div class="main-content">
		${content}
	</div>
	<script src="/scripts/feature-flags.js"></script>
	<script src="/scripts/theme-manager-bundled.js"></script>
</body>
</html>`;
