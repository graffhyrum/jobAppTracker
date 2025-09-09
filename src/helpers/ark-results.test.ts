import { describe, expect, test } from "bun:test";
import { type as AT } from "arktype";
import { ok } from "neverthrow";
import { toArkResult } from "./ark-results.ts";

const arkTypeSting = AT.string;
const arkTypeNumber = AT.number;
const arkTypePerson = AT({
	name: "string",
	age: "number",
	address: {
		street: "string",
		city: "string",
		state: "string",
		zip: "9999 < number < 100000",
	},
});
type TestPerson = typeof arkTypePerson.infer; // convenience
const goodTestPerson: TestPerson = {
	name: "John",
	age: 30,
	address: {
		street: "123 Main St",
		city: "New York",
		state: "NY",
		zip: 10001,
	},
};

describe("good input", () => {
	test("string", () => {
		const testString = "hello";
		const res = toArkResult(arkTypeSting, testString);
		expect(res).toEqual(ok(testString));
	});

	test("number", () => {
		const testNumber = 123;
		const res = toArkResult(arkTypeNumber, testNumber);
		expect(res).toEqual(ok(testNumber));
	});

	test("object", () => {
		const res = toArkResult(arkTypePerson, goodTestPerson);
		expect(res).toEqual(ok(goodTestPerson));
	});
});

describe("bad input", () => {
	test("string", () => {
		const testString = 123;
		const res = toArkResult(arkTypeSting, testString);
		expect(res.isErr()).toBe(true);
		expect(res._unsafeUnwrapErr()).toBeInstanceOf(Error);
	});

	test("number", () => {
		const testNumber = "hello";
		const res = toArkResult(arkTypeNumber, testNumber);
		expect(res.isErr()).toBe(true);
		expect(res._unsafeUnwrapErr()).toBeInstanceOf(Error);
	});

	test("object - bad key", () => {
		const badPerson = {
			...goodTestPerson,
			name: 123,
		};
		const res = toArkResult(arkTypePerson, badPerson);
		expect(res.isErr()).toBe(true);
		expect(res._unsafeUnwrapErr()).toBeInstanceOf(Error);
	});
});
