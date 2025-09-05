// Helper function to serve CSS files with proper error handling
export const serveCSSFile = (filePath: string, fileName: string) => {
	return async (): Promise<Response> => {
		try {
			const file = Bun.file(filePath);
			const exists = await file.exists();
			if (!exists) {
				return new Response("CSS file not found", {
					status: 404,
					headers: { "Content-Type": "text/plain" },
				});
			}
			return new Response(file, {
				headers: {
					"Content-Type": "text/css",
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
