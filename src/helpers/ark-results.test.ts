import { describe, expect, test } from "bun:test";

import { ArkErrors, type as AT, scope } from "arktype";
import { Either, pipe } from "effect";

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
const testModule = scope({
	foo: "string",
	bar: {
		bis: "number",
		baz: "string",
	},
	fooBar: "foo | bar",
}).export();
const keyOfBarSchema = testModule.bar.keyof();

describe("toArkResult", () => {
	describe("good input", () => {
		test("string", () => {
			const testString = "hello";
			const res = toArkResult(arkTypeSting, testString);
			expect(res).toEqual(Either.right(testString));
		});

		test("number", () => {
			const testNumber = 123;
			const res = toArkResult(arkTypeNumber, testNumber);
			expect(res).toEqual(Either.right(testNumber));
		});

		test("object", () => {
			const res = toArkResult(arkTypePerson, goodTestPerson);
			expect(res).toEqual(Either.right(goodTestPerson));
		});

		test("module", () => {
			const goodFoo = "good foo";
			const goodBar = {
				bis: 123,
				baz: "good baz",
			};
			const goodFooBar = goodBar;
			const { foo, bar, fooBar } = testModule;
			const fooRes = toArkResult(foo, goodFoo);
			expect(fooRes).toEqual(Either.right(goodFoo));
			const barRes = toArkResult(bar, goodBar);
			expect(barRes).toEqual(Either.right(goodBar));
			const fooBarRes = toArkResult(fooBar, goodFooBar);
			expect(fooBarRes).toEqual(Either.right(goodFooBar));
		});

		test("keyof", () => {
			const key = "bis";
			const keyRes = toArkResult(keyOfBarSchema, key);
			expect(keyRes).toEqual(Either.right(key));
		});

		test("keyof - with get", () => {
			const key = "bis";
			const testBis = 123;
			const res = pipe(
				toArkResult(keyOfBarSchema, key),
				Either.map((k) => testModule.bar.get(k)),
				Either.flatMap((schemaFromGet) => toArkResult(schemaFromGet, testBis)),
			);
			expect(res).toEqual(Either.right(testBis));
		});
	});

	describe("bad input", () => {
		test("string", () => {
			const testString = 123;
			const res = toArkResult(arkTypeSting, testString);
			expect(Either.isLeft(res)).toBe(true);
			if (Either.isLeft(res)) {
				expect(res.left).toBeInstanceOf(ArkErrors);
			}
		});

		test("number", () => {
			const testNumber = "hello";
			const res = toArkResult(arkTypeNumber, testNumber);
			expect(Either.isLeft(res)).toBe(true);
			if (Either.isLeft(res)) {
				expect(res.left).toBeInstanceOf(ArkErrors);
			}
		});

		test("object - bad key", () => {
			const badPerson = {
				...goodTestPerson,
				name: 123,
			};
			const res = toArkResult(arkTypePerson, badPerson);
			expect(Either.isLeft(res)).toBe(true);
			if (Either.isLeft(res)) {
				expect(res.left).toBeInstanceOf(ArkErrors);
			}
		});
	});
});
