import { type } from "arktype";
import { jobApplicationModule } from "../../domain/entities/job-application.ts";

// Route parameter validation
export const applicationIdParamSchema = type({
	id: jobApplicationModule.JobAppId,
});

export const createApplicationBodySchema = jobApplicationModule.forCreate;
export const updateApplicationBodySchema = jobApplicationModule.FormForUpdate;

// Search query validation
export const searchQuerySchema = type({
	"q?": "string",
});
