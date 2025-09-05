import { startBunServer } from "./application/server/startBunServer.ts";

main();

function main() {
	console.log("Hello via Bun!");
	startBunServer();
}
