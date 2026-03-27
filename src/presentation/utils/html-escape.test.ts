import { describe, expect, test } from "bun:test";

import { escapeHtml, escapeScriptContent, safeHref } from "./html-escape";

describe("escapeHtml", () => {
	test("escapes ampersand", () => {
		expect(escapeHtml("a&b")).toBe("a&amp;b");
	});

	test("escapes less-than", () => {
		expect(escapeHtml("a<b")).toBe("a&lt;b");
	});

	test("escapes greater-than", () => {
		expect(escapeHtml("a>b")).toBe("a&gt;b");
	});

	test("escapes double quotes", () => {
		expect(escapeHtml('a"b')).toBe("a&quot;b");
	});

	test("escapes single quotes", () => {
		expect(escapeHtml("a'b")).toBe("a&#x27;b");
	});

	test("escapes all five characters in one string", () => {
		expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#x27;");
	});

	test("returns empty string for empty input", () => {
		expect(escapeHtml("")).toBe("");
	});

	test("leaves safe strings unchanged", () => {
		expect(escapeHtml("hello world 123")).toBe("hello world 123");
	});

	test("is NOT idempotent — double-escaping produces different output", () => {
		const once = escapeHtml("&");
		const twice = escapeHtml(once);
		expect(once).toBe("&amp;");
		expect(twice).toBe("&amp;amp;");
		expect(once).not.toBe(twice);
	});

	test("handles multiple occurrences of same character", () => {
		expect(escapeHtml("<<>>")).toBe("&lt;&lt;&gt;&gt;");
	});
});

describe("safeHref", () => {
	test("allows http URLs", () => {
		expect(safeHref("http://example.com")).toBe("http://example.com");
	});

	test("allows https URLs", () => {
		expect(safeHref("https://example.com")).toBe("https://example.com");
	});

	test("allows HTTP (case-insensitive)", () => {
		expect(safeHref("HTTP://EXAMPLE.COM")).toBe("HTTP://EXAMPLE.COM");
	});

	test("allows HTTPS (case-insensitive)", () => {
		expect(safeHref("HTTPS://example.com")).toBe("HTTPS://example.com");
	});

	test("allows relative paths starting with /", () => {
		expect(safeHref("/jobs/123")).toBe("/jobs/123");
	});

	test("allows root path", () => {
		expect(safeHref("/")).toBe("/");
	});

	test("HTML-escapes valid URLs after validation", () => {
		expect(safeHref("https://example.com?a=1&b=2")).toBe(
			"https://example.com?a=1&amp;b=2",
		);
	});

	test("HTML-escapes relative paths", () => {
		expect(safeHref("/search?q=<script>")).toBe("/search?q=&lt;script&gt;");
	});

	test("rejects javascript: scheme", () => {
		expect(safeHref("javascript:alert(1)")).toBe("");
	});

	test("rejects JAVASCRIPT: scheme (case-insensitive)", () => {
		expect(safeHref("JAVASCRIPT:alert(1)")).toBe("");
	});

	test("rejects jAvAsCrIpT: scheme (mixed case)", () => {
		expect(safeHref("jAvAsCrIpT:alert(1)")).toBe("");
	});

	test("rejects data: scheme", () => {
		expect(safeHref("data:text/html,<h1>Hi</h1>")).toBe("");
	});

	test("rejects DATA: scheme (case-insensitive)", () => {
		expect(safeHref("DATA:text/html,<h1>Hi</h1>")).toBe("");
	});

	test("rejects vbscript: scheme", () => {
		expect(safeHref("vbscript:MsgBox('hi')")).toBe("");
	});

	test("rejects VBSCRIPT: scheme (case-insensitive)", () => {
		expect(safeHref("VBSCRIPT:MsgBox('hi')")).toBe("");
	});

	test("rejects protocol-relative URLs", () => {
		expect(safeHref("//evil.com/payload")).toBe("");
	});

	test("rejects mailto:", () => {
		expect(safeHref("mailto:user@example.com")).toBe("");
	});

	test("rejects tel:", () => {
		expect(safeHref("tel:+1234567890")).toBe("");
	});

	test("rejects bare paths without leading /", () => {
		expect(safeHref("jobs/123")).toBe("");
	});

	test("rejects bare filenames", () => {
		expect(safeHref("index.html")).toBe("");
	});

	test("returns empty string for empty input", () => {
		expect(safeHref("")).toBe("");
	});

	test("returns empty string for whitespace-only input", () => {
		expect(safeHref("   ")).toBe("");
	});

	test("trims whitespace before validation", () => {
		expect(safeHref("  /jobs/123  ")).toBe("/jobs/123");
	});

	test("rejects ftp: scheme", () => {
		expect(safeHref("ftp://files.example.com")).toBe("");
	});

	test("rejects unknown schemes", () => {
		expect(safeHref("custom:something")).toBe("");
	});
});

describe("escapeScriptContent", () => {
	test("replaces </script> with <\\/script>", () => {
		expect(escapeScriptContent('{"key":"</script>value"}')).toBe(
			'{"key":"<\\/script>value"}',
		);
	});

	test("replaces <!-- with <\\!--", () => {
		expect(escapeScriptContent('{"key":"<!--comment"}')).toBe(
			'{"key":"<\\!--comment"}',
		);
	});

	test("replaces U+2028 with \\u2028", () => {
		expect(escapeScriptContent("before\u2028after")).toBe("before\\u2028after");
	});

	test("replaces U+2029 with \\u2029", () => {
		expect(escapeScriptContent("before\u2029after")).toBe("before\\u2029after");
	});

	test("handles all four patterns in one string", () => {
		const input = "</script><!--\u2028\u2029";
		const expected = "<\\/script><\\!--\\u2028\\u2029";
		expect(escapeScriptContent(input)).toBe(expected);
	});

	test("returns empty string for empty input", () => {
		expect(escapeScriptContent("")).toBe("");
	});

	test("leaves safe JSON unchanged", () => {
		const safe = '{"name":"John","age":30}';
		expect(escapeScriptContent(safe)).toBe(safe);
	});

	test("handles multiple occurrences of </script>", () => {
		expect(escapeScriptContent("</script></script>")).toBe(
			"<\\/script><\\/script>",
		);
	});

	test("case-sensitive — does not alter </SCRIPT>", () => {
		// Only lowercase </script> is dangerous for script tag closing
		expect(escapeScriptContent("</SCRIPT>")).toBe("</SCRIPT>");
	});
});
