import { type } from "arktype";
import { jobApplicationModule } from "../../domain/entities/job-application.ts";

// Route parameter validation
export const applicationIdParamSchema = type({
	id: jobApplicationModule.JobAppId,
});

// Use FormForCreate for HTML form submissions (accepts strings and booleans)
export const createApplicationBodySchema = jobApplicationModule.FormForCreate;
export const updateApplicationBodySchema = jobApplicationModule.FormForUpdate;

// Search query validation
export const searchQuerySchema = type({
	"q?": "string",
});
