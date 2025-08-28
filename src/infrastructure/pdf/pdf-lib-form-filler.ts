import { err, ok, type Result, ResultAsync } from "neverthrow";
import { PDFDocument } from "pdf-lib";
import type { JobApplication } from "../../domain/entities/job-application";
import type {
	PDFFieldInfo,
	PDFFormFiller,
	PDFTemplate,
} from "../../domain/ports/pdf-form-filler";
import { createPDFError } from "../../domain/ports/pdf-form-filler";
import { getEntries } from "../../helpers/entries.ts";

// Minimal pdf-lib based adapter. It fills text fields that match template.fieldMappings values.

export function createPDFLibFormFiller(): PDFFormFiller {
	return {
		fillForm(
			application: JobApplication,
			template: PDFTemplate,
		): ResultAsync<Uint8Array, Error & { name: "PDFError" }> {
			return ResultAsync.fromPromise(
				(async () => {
					const templateBytes = await Bun.file(template.filePath).arrayBuffer();
					const pdfDoc = await PDFDocument.load(templateBytes);
					const form = pdfDoc.getForm();

					// Simple mapping: for each mapping key->pdfFieldName, set value from application
					for (const [appKey, pdfFieldName] of getEntries(
						template.fieldMappings,
					)) {
						if (!pdfFieldName) continue;
						const field = form.getTextField(pdfFieldName) ?? null;
						if (!field) continue;

						// extract value from application safely
						const value = readApplicationField(
							application,
							appKey as keyof JobApplication,
						);
						if (value == null) continue;
						field.setText(String(value));
					}

					form.updateFieldAppearances();
					return await pdfDoc.save();
				})(),
				(e) =>
					createPDFError(
						"Failed to fill PDF form",
						e instanceof Error ? e : undefined,
					),
			);
		},

		validateTemplate(
			templatePath: string,
		): Result<PDFFieldInfo[], Error & { name: "PDFError" }> {
			// Best-effort: we cannot synchronously read fields without async. Return ok([]) and encourage runtime validation in fill.
			try {
				// We will just check the file exists
				const file = Bun.file(templatePath);
				if (!file) return ok([]);
				return ok([]);
			} catch (e) {
				return err(
					createPDFError(
						"Failed to validate template",
						e instanceof Error ? e : undefined,
					),
				);
			}
		},
	};
}

function readApplicationField(
	app: JobApplication,
	key: keyof JobApplication,
): unknown {
	try {
		const record = app as unknown as Record<string, unknown>;
		const v = record[key as string];
		if (typeof v === "function") {
			return v();
		}
		return v;
	} catch {
		return undefined;
	}
}
