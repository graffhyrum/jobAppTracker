import { afterEach, describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import {
	createJobApplication,
	type JobApplication,
} from "../../domain/entities/job-application";
import type { PDFTemplate } from "../../domain/ports/pdf-form-filler";
import { expectDefined } from "../../helpers/expectDefined.ts";
import { createPDFLibFormFiller } from "./pdf-lib-form-filler";

describe("pdf-lib-form-filler", () => {
	it("fills a text field from JobApplication mapping", async () => {
		const tmpPath = `./test-results/tmp-form-${Date.now()}.pdf`;
		const fieldName = "companyField";
		await createTemplateWithTextField(tmpPath, fieldName);

		const app = createJobApplication({
			company: "Acme Corp",
			positionTitle: "Engineer",
			applicationDate: new Date().toISOString(),
		})._unsafeUnwrap();

		const template: PDFTemplate = {
			id: "t1",
			name: "Test",
			filePath: tmpPath,
			fieldMappings: { company: fieldName },
			createdAt: new Date(),
		};

		const filler = createPDFLibFormFiller();
		const res = await filler.fillForm(app, template).match(
			(v) => v,
			(e) => {
				throw e;
			},
		);
		expect(res.byteLength).toBeGreaterThan(100);

		// Basic check: resulting PDF is larger than the template
		const original = await Bun.file(tmpPath).arrayBuffer();
		expect(res.byteLength).toBeGreaterThan(original.byteLength);
	});
});

describe("pdf-lib-form-filler additional coverage", () => {
	const originalBunFile = Bun.file;

	afterEach(() => {
		// restore Bun.file after each test in case of stub
		Bun.file = originalBunFile;
	});

	it("fillForm maps errors to PDFError when underlying read fails", async () => {
		Bun.file = () => {
			throw new Error("fs failure");
		};

		const filler = createPDFLibFormFiller();
		const template: PDFTemplate = {
			id: "t1",
			name: "bad",
			filePath: "./does-not-matter.pdf",
			fieldMappings: {},
			createdAt: new Date(),
		};

		// Use a minimal fake application; it won't be reached due to early failure
		const app = { id: "x" };
		const res = await filler.fillForm(app as JobApplication, template);
		expect(res.isErr()).toBe(true);
		if (res.isErr()) {
			expect(res.error.name).toBe("PDFError");
			expect(res.error.message).toContain("Failed to fill PDF form");
		}
	});

	it("validateTemplate returns err(PDFError) when Bun.file throws", () => {
		Bun.file = () => {
			throw new Error("boom");
		};
		const filler = createPDFLibFormFiller();
		const res = filler.validateTemplate("/path/irrelevant.pdf");
		expect(res.isErr()).toBe(true);
		if (res.isErr()) {
			expect(res.error.name).toBe("PDFError");
			expect(res.error.message).toContain("Failed to validate template");
		}
	});

	it("fillForm handles function-valued fields and errors in field access gracefully", async () => {
		const tmpPath = `./test-results/tmp-form-fn-${Date.now()}.pdf`;
		const field1 = "fnField";
		const field2 = "safeField";
		await createTemplateWithTextField(tmpPath, field1);
		// add a second field on the same document
		{
			const bytes = await Bun.file(tmpPath).arrayBuffer();
			const pdfDoc = await PDFDocument.load(bytes);
			const page = pdfDoc.getPages()[0];
			expectDefined(page);
			const form = pdfDoc.getForm();
			const tf2 = form.createTextField(field2);
			tf2.addToPage(page, { x: 20, y: 30, width: 200, height: 20 });
			await Bun.write(tmpPath, await pdfDoc.save());
		}

		// Fake JobApplication where one property is a function, and accessing another throws via Proxy
		const base = {
			id: "a1",
			// function-valued property should be invoked and converted to string
			updatedAt: () => "2020-01-01T00:00:00.000Z",
		};
		const app = new Proxy(base, {
			get(target, prop: string | symbol, receiver) {
				if (prop === "company") {
					throw new Error("access error");
				}
				return Reflect.get(target, prop, receiver);
			},
		});

		const template: PDFTemplate = {
			id: "t2",
			name: "Test",
			filePath: tmpPath,
			fieldMappings: { updatedAt: field1, company: field2 },
			createdAt: new Date(),
		};

		const filler = createPDFLibFormFiller();
		const res2 = await filler.fillForm(
			app as unknown as JobApplication,
			template,
		);
		expect(res2.isOk()).toBe(true);
		if (!res2.isOk()) return;
		const bytes = res2.value;
		// Should still produce a valid PDF
		expect(bytes.byteLength).toBeGreaterThan(100);
	});
});

describe("pdf-lib-form-filler validateTemplate", () => {
	it("returns ok for existing file path", async () => {
		const filler = createPDFLibFormFiller();
		// Create a tiny empty file
		const path = `./test-results/empty-${Date.now()}.pdf`;
		await Bun.write(path, new Uint8Array());
		const res = filler.validateTemplate(path);
		expect(res.isOk()).toBe(true);
		if (res.isOk()) {
			expect(Array.isArray(res.value)).toBe(true);
		}
	});
});

async function createTemplateWithTextField(
	filePath: string,
	fieldName: string,
) {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([400, 200]);
	const form = pdfDoc.getForm();
	const tf = form.createTextField(fieldName);
	tf.addToPage(page, { x: 50, y: 100, width: 300, height: 24 });
	const bytes = await pdfDoc.save();
	await Bun.write(filePath, bytes);
}
