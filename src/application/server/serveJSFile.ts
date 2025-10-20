// Helper function to serve JavaScript files with proper error handling
// Transpiles TypeScript to JavaScript on the fly using Bun.build
export const serveJSFile = (filePath: string, fileName: string) => {
	return async (): Promise<Response> => {
		try {
			const file = Bun.file(filePath);
			const exists = await file.exists();
			if (!exists) {
				return new Response("JavaScript file not found", {
					status: 404,
					headers: { "Content-Type": "text/plain" },
				});
			}

			// Build TypeScript to JavaScript using Bun
			const buildResult = await Bun.build({
				entrypoints: [filePath],
				target: "browser",
				minify: false,
			});

			if (!buildResult.success) {
				console.error(`Error building ${fileName}:`, buildResult.logs);
				return new Response("Build error", {
					status: 500,
					headers: { "Content-Type": "text/plain" },
				});
			}

			const output = buildResult.outputs[0];
			return new Response(output, {
				headers: {
					"Content-Type": "application/javascript",
					"Cache-Control": "public, max-age=3600",
				},
			});
		} catch (error) {
			console.error(`Error serving ${fileName}:`, error);
			return new Response("Internal server error", {
				status: 500,
				headers: { "Content-Type": "text/plain" },
			});
		}
	};
};
