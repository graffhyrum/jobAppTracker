import { restoreJobApplications } from "./utils/backup-job-applications.ts";

async function globalTeardown() {
	await restoreJobApplications();
}

export default globalTeardown;
