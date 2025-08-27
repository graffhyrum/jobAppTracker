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
			margin: 40px;
			background-color: #f5f5f5;
		}
	</style>
</head>
<body>
	${content}
</body>
</html>`;
