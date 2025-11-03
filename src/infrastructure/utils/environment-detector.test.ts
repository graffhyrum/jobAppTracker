import { afterEach, describe, expect, it } from "bun:test";
import {
	getEnvironment,
	isDevelopment,
	isProduction,
} from "./environment-detector";

describe("environment-detector", () => {
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		// Restore original NODE_ENV
		process.env.NODE_ENV = originalNodeEnv;
	});

	describe("isDevelopment", () => {
		it("returns a boolean value", () => {
			const result = isDevelopment();
			expect(typeof result).toBe("boolean");
		});

		it("detects development from actual Bun.main path", () => {
			// When running tests, Bun.main typically contains /src/
			// This is an integration test that verifies actual behavior
			const bunMainPath = Bun.main;
			const containsSrc =
				bunMainPath.includes("/src/") || bunMainPath.includes("\\src\\");

			if (containsSrc) {
				expect(isDevelopment()).toBe(true);
			}
		});

		it("returns true when NODE_ENV is development", () => {
			const previousNodeEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";

			// Even if running from dist, NODE_ENV should override
			const result = isDevelopment();

			// Restore immediately to avoid test pollution
			process.env.NODE_ENV = previousNodeEnv;

			expect(result).toBe(true);
		});
	});

	describe("isProduction", () => {
		it("returns opposite of isDevelopment", () => {
			const devResult = isDevelopment();
			const prodResult = isProduction();

			expect(prodResult).toBe(!devResult);
		});

		it("returns a boolean value", () => {
			const result = isProduction();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("getEnvironment", () => {
		it('returns either "development" or "production"', () => {
			const result = getEnvironment();
			expect(["development", "production"]).toContain(result);
		});

		it("matches isDevelopment result", () => {
			const env = getEnvironment();
			const isDev = isDevelopment();

			if (isDev) {
				expect(env).toBe("development");
			} else {
				expect(env).toBe("production");
			}
		});
	});
});
