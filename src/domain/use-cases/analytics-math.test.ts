import { describe, expect, test } from "bun:test";

import {
	computeAverage,
	computeMedian,
	computeSuccessRate,
} from "./analytics-math.ts";

describe("computeMedian", () => {
	test("returns 0 for empty array", () => {
		expect(computeMedian([])).toBe(0);
	});

	test("returns the single element for array of length 1", () => {
		expect(computeMedian([5])).toBe(5);
	});

	test("returns middle element for odd-length array", () => {
		expect(computeMedian([1, 3, 5])).toBe(3);
	});

	test("returns average of two middle elements for even-length array", () => {
		expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
	});

	test("handles unsorted input", () => {
		expect(computeMedian([5, 1, 3])).toBe(3);
	});

	test("does not mutate original array", () => {
		const input = [3, 1, 2];
		computeMedian(input);
		expect(input).toEqual([3, 1, 2]);
	});

	test("handles duplicate values", () => {
		expect(computeMedian([2, 2, 2, 2])).toBe(2);
	});

	test("handles negative numbers", () => {
		expect(computeMedian([-3, -1, -2])).toBe(-2);
	});
});

describe("computeAverage", () => {
	test("returns 0 for empty array", () => {
		expect(computeAverage([])).toBe(0);
	});

	test("returns the single element for array of length 1", () => {
		expect(computeAverage([7])).toBe(7);
	});

	test("computes correct average", () => {
		expect(computeAverage([2, 4, 6])).toBe(4);
	});

	test("handles decimal results", () => {
		expect(computeAverage([1, 2])).toBe(1.5);
	});
});

describe("computeSuccessRate", () => {
	test("returns 0 when both offers and rejected are 0", () => {
		expect(computeSuccessRate(0, 0)).toBe(0);
	});

	test("returns 1 when all outcomes are offers", () => {
		expect(computeSuccessRate(5, 0)).toBe(1);
	});

	test("returns 0 when all outcomes are rejections", () => {
		expect(computeSuccessRate(0, 5)).toBe(0);
	});

	test("computes correct rate for mixed outcomes", () => {
		expect(computeSuccessRate(3, 7)).toBeCloseTo(0.3);
	});
});
