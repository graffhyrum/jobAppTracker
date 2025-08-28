import { describe, expect, it } from "bun:test";
import { createPDFError } from "./pdf-form-filler";

describe("PDF domain port helpers", () => {
	it("createPDFError sets name and message", () => {
		const e = createPDFError("msg");
		expect(e.name).toBe("PDFError");
		expect(e.message.includes("msg")).toBe(true);
	});
});
