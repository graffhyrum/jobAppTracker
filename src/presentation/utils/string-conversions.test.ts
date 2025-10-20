import { expect, test } from "bun:test";
import {
	camelCaseToHyphenated,
	camelCaseToSpaceSeparatedLower,
	camelCaseToSpaceSeparatedUpper,
} from "#src/presentation/utils/string-conversions.ts";

test("camelCaseToSpaceSeparatedLower", () => {
	expect(camelCaseToSpaceSeparatedLower("interestRating")).toBe(
		"interest rating",
	);
	expect(camelCaseToSpaceSeparatedLower("anotherTestString")).toBe(
		"another test string",
	);
	expect(camelCaseToSpaceSeparatedLower("singleword")).toBe("singleword");
	expect(camelCaseToSpaceSeparatedLower("")).toBe("");
});
test("camelCaseToSpaceSeparatedUpper", () => {
	expect(camelCaseToSpaceSeparatedUpper("interestRating")).toBe(
		"Interest Rating",
	);
	expect(camelCaseToSpaceSeparatedUpper("anotherTestString")).toBe(
		"Another Test String",
	);
	expect(camelCaseToSpaceSeparatedUpper("singleword")).toBe("Singleword");
	expect(camelCaseToSpaceSeparatedUpper("")).toBe("");
});
test("camelCaseToHyphenated", () => {
	expect(camelCaseToHyphenated("interestRating")).toBe("interest-rating");
	expect(camelCaseToHyphenated("anotherTestString")).toBe(
		"another-test-string",
	);
	expect(camelCaseToHyphenated("singleword")).toBe("singleword");
	expect(camelCaseToHyphenated("")).toBe("");
});
