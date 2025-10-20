import { ensureTestTablesExist } from "./utils/sqlite-test-isolation.ts";

async function globalTeardown() {
	console.log("\n🧹 E2E Test Suite Cleanup");
	await ensureTestTablesExist();
	console.log("✅ E2E Global Teardown Complete\n");
}

export default globalTeardown;
