import path from "node:path";
import { fileIOProvider } from "../../../src/infrastructure/di/file-io-provider.ts";

const dataDir = path.join(process.cwd(), "data");
const originalFileName = "job-applications.json";
const originalFile = path.join(dataDir, originalFileName);
const backupFile = path.join(dataDir, `backup-${originalFileName}`);
const fileIO = fileIOProvider;

export async function backupJobApplications() {
	console.log("\n🔧 E2E Global Setup: Backing up job Applications");

	await fileIO
		.createDir(dataDir)
		.andThen(() => fileIO.exists(originalFile))
		.andThen((exists) => {
			if (exists) {
				console.log(`📦 Backing up existing ${originalFileName}`);
				return fileIO.readText(originalFile);
			} else {
				console.log(
					`📄 No existing ${originalFileName} found - starting fresh`,
				);
				return fileIO.writeText(originalFile, "[]").map(() => "[]");
			}
		})
		.andThen((content) => fileIO.writeText(backupFile, content))
		.match(
			() => console.log(""),
			(error) => {
				console.error("❌ Failed to backup test data:", error);
				throw error;
			},
		);
}

export async function restoreJobApplications() {
	console.log("\n🔧 E2E Global Teardown: Restoring job applications");

	await fileIO
		.exists(backupFile)
		.andThen((exists) => {
			if (exists) {
				console.log(`📦 Restoring backup of ${originalFileName}`);
				return fileIO.readText(backupFile);
			} else {
				console.log(`📄 No backup found of ${originalFileName} starting fresh`);
				return fileIO.writeText(originalFile, "[]").map(() => "[]");
			}
		})
		.andThen((content) => fileIO.writeText(originalFile, content))
		.match(
			() => console.log(""),
			(error) => {
				console.error("❌ Failed to restore data:", error);
				throw error;
			},
		);
}
