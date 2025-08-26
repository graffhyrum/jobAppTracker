main();

function main() {
	console.log("Hello via Bun!");
	startBunServer();
}

function startBunServer() {
	Bun.serve({
		routes: {
			"/health": new Response("OK"),
		},
	});
}
