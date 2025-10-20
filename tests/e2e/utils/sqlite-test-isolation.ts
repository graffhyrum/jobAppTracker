import { processEnv } from "../../../processEnvFacade.ts";

const baseURL = `${processEnv.BASE_URL}:${processEnv.PORT}`;

export async function clearTestTables() {
	console.log("\n🔧 E2E Global Setup: Clearing test tables via API");

	try {
		// Since we use in-memory SQLite for tests, just verify server is up
		// The database starts fresh for each test run anyway
		const response = await fetch(`${baseURL}/health`);
		if (response.ok) {
			console.log("📦 Test environment ready (in-memory database)");
		} else {
			throw new Error(`Health check failed: ${response.status}`);
		}
	} catch (error) {
		console.error("❌ Failed to connect to test server:", error);
		throw error;
	}
}

export async function ensureTestTablesExist() {
	console.log("\n🔧 E2E Global Teardown: Test environment cleanup");
	// No cleanup needed for in-memory database - it's destroyed with the process
}
