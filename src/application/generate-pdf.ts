import { errAsync, type ResultAsync } from "neverthrow";
import type { JobApplicationRepository } from "../domain/ports/job-application-repository";
import type {
	PDFFormFiller,
	PDFTemplate,
} from "../domain/ports/pdf-form-filler";
import { createPDFError } from "../domain/ports/pdf-form-filler";

export function generateFilledPDF(
	applicationId: string,
	repo: JobApplicationRepository,
	filler: PDFFormFiller,
	template: PDFTemplate,
): ResultAsync<Uint8Array, Error> {
	return repo.findById(applicationId).andThen((app) => {
		if (!app)
			return errAsync(
				createPDFError(`Application not found: ${applicationId}`),
			);
		return filler.fillForm(app, template);
	});
}
