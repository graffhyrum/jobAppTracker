import { startElysiaServer } from "./application/server/startElysiaServer.ts";

main();

function main() {
	console.log("🚀 Starting Job Application Tracker with Elysia...");
	startElysiaServer();
}
