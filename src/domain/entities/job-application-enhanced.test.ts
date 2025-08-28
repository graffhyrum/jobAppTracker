import { describe, expect, test } from "bun:test";
import { createJobApplication } from "./job-application";

describe("JobApplication Enhanced Methods", () => {
	test("isOverdue should return false when no next event date", () => {
		const result = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;
		expect(app.isOverdue()).toBe(false);
	});

	test("isOverdue should return true when next event date is in the past", () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

		const result = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: pastDate.toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;
		expect(app.isOverdue()).toBe(true);
	});

	test("isOverdue should return false when next event date is in the future", () => {
		const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

		const result = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: futureDate.toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;
		expect(app.isOverdue()).toBe(false);
	});

	test("getCurrentStatus should return null when no status log entries", () => {
		const result = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;
		expect(app.getCurrentStatus()).toBeNull();
	});

	test("getCurrentStatus should return the latest status", () => {
		const result = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;

		// Add first status
		app.newStatus({ category: "active", current: "applied" });

		// Small delay to ensure different timestamps
		const delay = () => new Promise((resolve) => setTimeout(resolve, 2));

		delay().then(() => {
			// Add second status
			app.newStatus({ category: "active", current: "interview" });

			const currentStatus = app.getCurrentStatus();
			expect(currentStatus).not.toBeNull();
			expect(currentStatus?.current).toBe("interview");
			expect(currentStatus?.category).toBe("active");
		});
	});

	test("getCurrentStatus should handle multiple statuses correctly", async () => {
		const result = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;

		// Add statuses with small delays to ensure different timestamps
		app.newStatus({ category: "active", current: "applied" });
		await new Promise((resolve) => setTimeout(resolve, 5));

		app.newStatus({ category: "active", current: "screening interview" });
		await new Promise((resolve) => setTimeout(resolve, 5));

		app.newStatus({ category: "inactive", current: "rejected" });

		const currentStatus = app.getCurrentStatus();
		expect(currentStatus).not.toBeNull();
		expect(currentStatus?.current).toBe("rejected");
		expect(currentStatus?.category).toBe("inactive");
	});

	test("status methods should work together correctly", async () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

		const result = createJobApplication({
			company: "Test Company",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
			nextEventDate: pastDate.toISOString(),
		});

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const app = result.value;

		// Add active status
		app.newStatus({ category: "active", current: "interview" });

		// Check both methods work correctly
		expect(app.isOverdue()).toBe(true);
		expect(app.getCurrentStatus()?.category).toBe("active");
		expect(app.getCurrentStatus()?.current).toBe("interview");
	});
});
