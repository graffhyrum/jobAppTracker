import { describe, expect, test } from "bun:test";

import { ArkErrors } from "arktype";

import { transformUpdateData } from "./application-route-helpers.ts";

describe("transformUpdateData", () => {
	test("throws ArkErrors when body fails objectJsonSchema validation", () => {
		// objectJsonSchema expects a JSON string that parses to an object matching
		// updateApplicationBodySchema. A non-JSON-string input should fail validation.
		const invalidBody = 12345;

		expect(() => transformUpdateData(invalidBody, null)).toThrow();
		try {
			transformUpdateData(invalidBody, null);
		} catch (e) {
			expect(e).toBeInstanceOf(ArkErrors);
		}
	});

	test("throws ArkErrors when body is a string instead of an object", () => {
		// objectJsonSchema expects an object input, not a string
		const invalidBody = "not an object";

		expect(() => transformUpdateData(invalidBody, null)).toThrow();
		try {
			transformUpdateData(invalidBody, null);
		} catch (e) {
			expect(e).toBeInstanceOf(ArkErrors);
		}
	});

	test("does not throw for valid object body matching update schema", () => {
		// updateApplicationBodySchema (FormForUpdate) accepts an object with optional string fields
		const validBody = { company: "Acme Corp" };

		// Should not throw - valid input proceeds through the function
		expect(() => transformUpdateData(validBody, null)).not.toThrow();
	});
});
