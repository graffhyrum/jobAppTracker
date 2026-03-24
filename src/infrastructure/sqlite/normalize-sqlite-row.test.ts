import { describe, expect, test } from "bun:test";

import {
	createRowNormalizer,
	normalizeContactRow,
	normalizeInterviewStageRow,
	normalizeJobAppRow,
	normalizeJobBoardRow,
} from "./normalize-sqlite-row.ts";

describe("createRowNormalizer", () => {
	test("returns non-object inputs unchanged", () => {
		const normalize = createRowNormalizer({});
		expect(normalize(null)).toBeNull();
		expect(normalize(undefined)).toBeUndefined();
		expect(normalize("string")).toBe("string");
		expect(normalize(42)).toBe(42);
	});

	test("strips null values (converts to undefined by omission)", () => {
		const normalize = createRowNormalizer({});
		const result = normalize({ a: "keep", b: null, c: 1 });
		expect(result).toEqual({ a: "keep", c: 1 });
	});

	test("applies json transform to string values", () => {
		const normalize = createRowNormalizer({ data: "json" });
		const result = normalize({ data: "[1, 2, 3]", other: "untouched" });
		expect(result).toEqual({ data: [1, 2, 3], other: "untouched" });
	});

	test("skips json transform for non-string values", () => {
		const normalize = createRowNormalizer({ data: "json" });
		const result = normalize({ data: 42 });
		expect(result).toEqual({ data: 42 });
	});

	test("applies boolean transform to number values", () => {
		const normalize = createRowNormalizer({ flag: "boolean" });
		expect(normalize({ flag: 1 })).toEqual({ flag: true });
		expect(normalize({ flag: 0 })).toEqual({ flag: false });
	});

	test("skips boolean transform for non-number values", () => {
		const normalize = createRowNormalizer({ flag: "boolean" });
		const result = normalize({ flag: "not-a-number" });
		expect(result).toEqual({ flag: "not-a-number" });
	});

	test("handles multiple transforms in a single config", () => {
		const normalize = createRowNormalizer({
			notes: "json",
			isActive: "boolean",
		});
		const result = normalize({
			id: "abc",
			notes: '{"text":"hello"}',
			isActive: 1,
			name: "test",
			optional: null,
		});
		expect(result).toEqual({
			id: "abc",
			notes: { text: "hello" },
			isActive: true,
			name: "test",
		});
	});
});

describe("pre-built normalizers", () => {
	test("normalizeJobAppRow handles notes, statusLog (json) and isRemote (boolean)", () => {
		const result = normalizeJobAppRow({
			id: "123",
			company: "Acme",
			notes: "[]",
			statusLog: '[["2024-01-01", {"category": "active", "label": "applied"}]]',
			isRemote: 1,
			interestRating: null,
		});
		expect(result).toEqual({
			id: "123",
			company: "Acme",
			notes: [],
			statusLog: [["2024-01-01", { category: "active", label: "applied" }]],
			isRemote: true,
		});
	});

	test("normalizeContactRow handles responseReceived (boolean)", () => {
		const result = normalizeContactRow({
			id: "c1",
			contactName: "Jane",
			responseReceived: 0,
			notes: null,
		});
		expect(result).toEqual({
			id: "c1",
			contactName: "Jane",
			responseReceived: false,
		});
	});

	test("normalizeInterviewStageRow handles questions (json) and isFinalRound (boolean)", () => {
		const result = normalizeInterviewStageRow({
			id: "is1",
			questions: '["Q1", "Q2"]',
			isFinalRound: 1,
			notes: null,
		});
		expect(result).toEqual({
			id: "is1",
			questions: ["Q1", "Q2"],
			isFinalRound: true,
		});
	});

	test("normalizeJobBoardRow handles domains (json)", () => {
		const result = normalizeJobBoardRow({
			id: "jb1",
			name: "Indeed",
			domains: '["indeed.com", "indeed.co.uk"]',
		});
		expect(result).toEqual({
			id: "jb1",
			name: "Indeed",
			domains: ["indeed.com", "indeed.co.uk"],
		});
	});
});
