import { healthcheckPage } from "./presentation/pages/healthcheck";
import { homepagePage } from "./presentation/pages/homepage";

main();

function main() {
	console.log("Hello via Bun!");
	startBunServer();
}

function startBunServer() {
	const server = Bun.serve({
		port: 3000,
		routes: {
			"/": () => {
				return new Response(homepagePage(), {
					headers: { "Content-Type": "text/html" },
				});
			},
			"/health": () => {
				return new Response(healthcheckPage(), {
					headers: { "Content-Type": "text/html" },
				});
			},
		},
		fetch(_request) {
			return new Response("Not Found", { status: 404 });
		},
		development: {
			hmr: true, // Enable Hot Module Reloading
			console: true, // Echo console logs from the browser to the terminal
		},
	});

	console.log(`Listening on ${server.url}`);
}
