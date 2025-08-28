import type { Result, ResultAsync } from "neverthrow";
import type { JobApplication } from "../entities/job-application";

export interface PDFError extends Error {
	readonly name: "PDFError";
}

export function createPDFError(message: string, cause?: Error): PDFError {
	const base = new Error(message, { cause });
	(base as unknown as { name: "PDFError" }).name = "PDFError";
	return base as PDFError;
}

export type PDFFieldInfo = {
	fieldName: string;
	fieldType: "text" | "checkbox" | "date";
	required: boolean;
};

export type PDFTemplate = {
	id: string;
	name: string;
	filePath: string;
	fieldMappings: Partial<
		Record<
			keyof ReturnType<JobApplication["getCurrentStatus"]> extends never
				? keyof JobApplication
				: keyof JobApplication,
			string
		>
	>;
	createdAt: Date;
};

export interface PDFFormFiller {
	fillForm(
		application: JobApplication,
		template: PDFTemplate,
	): ResultAsync<Uint8Array, PDFError>;
	validateTemplate(templatePath: string): Result<PDFFieldInfo[], PDFError>;
}
