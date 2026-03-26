import { describe, expect, test } from "bun:test";
import { ArkErrors } from "arktype";

import type { JobApplication } from "#src/domain/entities/job-application.ts";
import {
	createApplicationStatus,
	extractStringField,
	transformUpdateData,
} from "./application-route-helpers.ts";

// Minimal JobApplication fixture for tests that need currentApp
const makeApp = (overrides: Partial<JobApplication> = {}): JobApplication => ({
	id: "00000000-0000-0000-0000-000000000001",
	company: "Test Corp",
	positionTitle: "Engineer",
	applicationDate: "2026-01-15T00:00:00.000Z",
	sourceType: "other",
	isRemote: false,
	createdAt: "2026-01-15T00:00:00.000Z",
	updatedAt: "2026-01-15T00:00:00.000Z",
	notes: [],
	statusLog: [
		[
			"2026-01-15T00:00:00.000Z",
			{ category: "active", label: "applied" },
		],
	],
	...overrides,
});

describe("transformUpdateData", () => {
	// The body input is a plain object (Elysia parses JSON before transform runs).
	// objectJsonSchema is type("object.json").to(FormForUpdate) which accepts objects.

	test("returns transformed data (not void) so callers can assign to ctx.body", () => {
		const result = transformUpdateData({ company: "New Corp" }, null);
		expect(result).toBeDefined();
		expect(result).toHaveProperty("company", "New Corp");
	});

	test("transforms company field", () => {
		const result = transformUpdateData({ company: "Acme Inc" }, null);
		expect(result.company).toBe("Acme Inc");
	});

	test("transforms status field into statusLog entry when currentApp provided", () => {
		const currentApp = makeApp();
		const result = transformUpdateData({ status: "interview" }, currentApp);
		// status field should be removed
		expect(result).not.toHaveProperty("status");
		// statusLog should have the original entry plus the new one
		expect(result.statusLog).toHaveLength(2);
		const newEntry = result.statusLog?.[1];
		expect(newEntry).toBeDefined();
		expect(newEntry![1]).toEqual({
			category: "active",
			label: "interview",
		});
	});

	test("throws when status is provided but currentApp is null", () => {
		expect(() => transformUpdateData({ status: "interview" }, null)).toThrow(
			"Cannot update status: current application could not be loaded",
		);
	});

	test("normalizes applicationDate to ISO datetime", () => {
		const result = transformUpdateData(
			{ applicationDate: "2026-03-15T00:00:00.000Z" },
			null,
		);
		expect(result.applicationDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	test("trims jobPostingUrl and removes if empty", () => {
		const result = transformUpdateData({ jobPostingUrl: "  " }, null);
		expect(result).not.toHaveProperty("jobPostingUrl");
	});

	test("trims jobPostingUrl and keeps if non-empty", () => {
		const result = transformUpdateData(
			{ jobPostingUrl: "  https://example.com  " },
			null,
		);
		expect(result.jobPostingUrl).toBe("https://example.com");
	});

	test("trims jobDescription and removes if empty", () => {
		const result = transformUpdateData({ jobDescription: "   " }, null);
		expect(result).not.toHaveProperty("jobDescription");
	});

	test("throws ArkErrors on non-object body", () => {
		expect(() => transformUpdateData("not an object", null)).toThrow();
		try {
			transformUpdateData("not an object", null);
		} catch (e) {
			expect(e).toBeInstanceOf(ArkErrors);
		}
	});

	test("throws ArkErrors on numeric body", () => {
		expect(() => transformUpdateData(12345, null)).toThrow();
		try {
			transformUpdateData(12345, null);
		} catch (e) {
			expect(e).toBeInstanceOf(ArkErrors);
		}
	});
});

describe("createApplicationStatus", () => {
	test("returns active category for active labels", () => {
		const result = createApplicationStatus("applied");
		expect(result.category).toBe("active");
		expect(result.label).toBe("applied");
	});

	test("returns inactive category for inactive labels", () => {
		const result = createApplicationStatus("rejected");
		expect(result.category).toBe("inactive");
		expect(result.label).toBe("rejected");
	});
});

describe("extractStringField", () => {
	test("returns string value as-is", () => {
		expect(extractStringField("hello")).toBe("hello");
	});

	test("returns empty string default for non-string", () => {
		expect(extractStringField(42)).toBe("");
	});

	test("returns explicit default for non-string when provided", () => {
		expect(extractStringField(null, "fallback")).toBe("fallback");
	});
});
