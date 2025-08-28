import { describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { createJobApplication } from "../domain/entities/job-application";
import type { PDFTemplate } from "../domain/ports/pdf-form-filler";
import { createPDFLibFormFiller } from "../infrastructure/pdf/pdf-lib-form-filler";
import { createJobApplicationMemoryRepository } from "../infrastructure/storage/job-application-memory-repository";
import { generateFilledPDF } from "./generate-pdf";

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

describe("generateFilledPDF use-case", () => {
	it("generates a PDF for an existing application", async () => {
		const repo = createJobApplicationMemoryRepository();
		const app = createJobApplication({
			company: "Globex",
			positionTitle: "Developer",
			applicationDate: new Date().toISOString(),
		})._unsafeUnwrap();
		await repo.save(app).match(
			() => undefined,
			(e) => {
				throw e;
			},
		);

		const tmpPath = `./test-results/tmp-form2-${Date.now()}.pdf`;
		const fieldName = "companyField";
		await createTemplateWithTextField(tmpPath, fieldName);

		const template: PDFTemplate = {
			id: "t2",
			name: "Test2",
			filePath: tmpPath,
			fieldMappings: { company: fieldName },
			createdAt: new Date(),
		};

		const filler = createPDFLibFormFiller();
		const res = await generateFilledPDF(app.id, repo, filler, template).match(
			(v) => v,
			(e) => {
				throw e;
			},
		);
		expect(res.byteLength).toBeGreaterThan(100);
	});
});

describe("generateFilledPDF errors", () => {
	it("returns error when application is not found", async () => {
		const repo = createJobApplicationMemoryRepository();
		const filler = createPDFLibFormFiller();
		const result = await generateFilledPDF("non-existent-id", repo, filler, {
			id: "t",
			name: "T",
			filePath: "./non-existent.pdf",
			fieldMappings: {},
			createdAt: new Date(),
		}).match(
			() => "ok",
			(e) => e,
		);
		expect(typeof result).toBe("object");
	});
});
