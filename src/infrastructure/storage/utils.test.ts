import { describe, expect, test } from "bun:test";
import { wrapAsyncOperation, wrapPromise } from "./utils";

describe("Utils", () => {
	describe("wrapPromise", () => {
		test("should wrap successful promise", async () => {
			const val = "success";
			const promise = Promise.resolve(val);
			const result = await wrapPromise(promise, "Failed operation");

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toEqual(val);
		});

		test("should wrap failing promise", async () => {
			const error = new Error("promise error");
			const promise = Promise.reject(error);
			const result = await wrapPromise(promise, "Failed operation");

			expect(result.isErr()).toBe(true);
		});
	});

	describe("wrapAsyncOperation", () => {
		test("should wrap successful async operation", async () => {
			const operation = async () => "success";
			const result = await wrapAsyncOperation(operation, "Failed operation");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe("success");
			}
		});

		test("should wrap failing async operation", async () => {
			const operation = async () => {
				throw new Error("regular error");
			};
			const result = await wrapAsyncOperation(operation, "Failed operation");

			expect(result.isErr()).toBe(true);
		});
	});
});
