import { clearTestTables } from "./utils/sqlite-test-isolation.ts";

async function globalSetup() {
	console.log("\n🚀 E2E Test Suite Starting");

	// Clear test tables
	await clearTestTables();

	console.log("✅ E2E Global Setup Complete\n");
}

export default globalSetup;
