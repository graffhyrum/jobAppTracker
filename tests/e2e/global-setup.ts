import { backupJobApplications } from "./utils/backup-job-applications.ts";

async function globalSetup() {
	await backupJobApplications();
}

export default globalSetup;
