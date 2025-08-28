import { describe, expect, test } from "bun:test";
import {
	toDatabaseError,
	toError,
	wrapAsyncOperation,
	wrapPromise,
} from "./utils";

describe("Utils", () => {
	describe("toError", () => {
		test("should return Error object if input is already an Error", () => {
			const originalError = new Error("original message");
			const result = toError(originalError);

			expect(result).toBe(originalError);
			expect(result.message).toBe("original message");
		});

		test("should convert non-Error to Error", () => {
			const result = toError("string error");

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("string error");
		});

		test("should convert null to Error", () => {
			const result = toError(null);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("null");
		});

		test("should convert object to Error", () => {
			const obj = { prop: "value" };
			const result = toError(obj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("[object Object]");
		});
	});

	describe("toDatabaseError", () => {
		test("should create DatabaseError with message and Error cause", () => {
			const cause = new Error("cause error");
			const result = toDatabaseError("database failed", cause);

			expect(result.name).toBe("DatabaseError");
		});

		test("should create DatabaseError with message and non-Error cause", () => {
			const result = toDatabaseError("database failed", "string cause");

			expect(result.name).toBe("DatabaseError");
		});
	});

	describe("wrapPromise", () => {
		test("should wrap successful promise", async () => {
			const promise = Promise.resolve("success");
			const result = await wrapPromise(promise, "Failed operation");

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe("success");
			}
		});

		test("should wrap failing promise", async () => {
			const promise = Promise.reject(new Error("promise error"));
			const result = await wrapPromise(promise, "Failed operation");

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.name).toBe("DatabaseError");
			}
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

		test("should preserve DatabaseError when thrown", async () => {
			const dbError = toDatabaseError("original db error", new Error("cause"));
			const operation = async () => {
				throw dbError;
			};
			const result = await wrapAsyncOperation(operation, "Failed operation");

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.name).toBe("DatabaseError");
			}
		});

		test("should wrap non-DatabaseError", async () => {
			const operation = async () => {
				throw new Error("regular error");
			};
			const result = await wrapAsyncOperation(operation, "Failed operation");

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error.name).toBe("DatabaseError");
			}
		});
	});
});
