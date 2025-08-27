import { navbar } from "./navbar";

export const layout = (title: string, content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
	<title>${title}</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.6/dist/htmx.min.js"></script>
	<style>
		body {
			font-family: Arial, sans-serif;
			margin: 0;
			background-color: #f5f5f5;
		}
		.main-content {
			padding: 20px 40px;
		}
	</style>
</head>
<body>
	${navbar()}
	<div class="main-content">
		${content}
	</div>
</body>
</html>`;
