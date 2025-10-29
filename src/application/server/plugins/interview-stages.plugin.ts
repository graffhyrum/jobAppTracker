import { scope, type } from "arktype";
import { Elysia, NotFoundError } from "elysia";
import { interviewStageRepositoryPlugin } from "#src/application/server/plugins/interviewStageRepository.plugin.ts";
import { uuidSchema } from "#src/domain/entities/uuid.ts";
import { uuidProvider } from "#src/infrastructure/di/uuid-provider.ts";
import {
	renderInterviewStageForm,
	renderInterviewStagesList,
} from "#src/presentation/components/interview-stage-list.ts";

// Schemas for route params and body
const idParamSchema = type({
	id: uuidSchema,
});

const formDataScope = scope({
	FormQuestion: {
		title: "string > 0",
		"answer?": "string",
	},
	FormData: {
		round: "string.numeric.parse",
		interviewType:
			"'phone screening'|'technical'|'behavioral'|'onsite'|'panel'|'other'",
		"isFinalRound?": "boolean",
		"scheduledDate?": "string.date.iso | ''",
		"completedDate?": "string.date.iso | ''",
		"notes?": "string",
		"questions?": "FormQuestion[]",
	},
});

const formDataSchema = formDataScope.export();

export const createInterviewStagesPlugin = new Elysia({
	prefix: "/applications",
})
	.use(interviewStageRepositoryPlugin)
	// GET /applications/:id/interview-stages - List all stages for application
	.get(
		"/:id/interview-stages",
		async ({ interviewStageRepository, params: { id: appId }, set }) => {
			const result =
				await interviewStageRepository.getByJobApplicationId(appId);

			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			set.headers["Content-Type"] = "text/html";
			return renderInterviewStagesList(result.value, appId);
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// GET /applications/:id/interview-stages/new - Returns new interview stage form
	.get(
		"/:id/interview-stages/new",
		async ({ params: { id: appId }, set }) => {
			set.headers["Content-Type"] = "text/html";
			return renderInterviewStageForm(appId);
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// POST /applications/:id/interview-stages - Create new interview stage
	.post(
		"/:id/interview-stages",
		async ({ interviewStageRepository, params: { id: appId }, body, set }) => {
			// Transform form data to domain entity
			const stageData = {
				jobApplicationId: appId,
				round: body.round,
				interviewType: body.interviewType,
				isFinalRound: body.isFinalRound ?? false,
				scheduledDate: body.scheduledDate || undefined,
				completedDate: body.completedDate || undefined,
				notes: body.notes,
				questions:
					body.questions?.map((q: { title: string; answer?: string }) => ({
						id: uuidProvider.generateUUID(),
						title: q.title,
						answer: q.answer,
					})) || [],
			};

			const result = await interviewStageRepository.create(stageData);

			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			// Return the new stage card
			set.headers["Content-Type"] = "text/html";
			const stages =
				await interviewStageRepository.getByJobApplicationId(appId);
			return stages.isOk()
				? renderInterviewStagesList(stages.value, appId)
				: `Error: ${stages.error}`;
		},
		{
			params: idParamSchema,
			body: formDataSchema.FormData,
		},
	);

// Separate plugin for interview stage operations (not prefixed by /applications)
export const createInterviewStageOperationsPlugin = new Elysia()
	.use(interviewStageRepositoryPlugin)
	// GET /interview-stages/:id - Get single stage (for display after cancel)
	.get(
		"/interview-stages/:id",
		async ({ interviewStageRepository, params: { id }, set }) => {
			const result = await interviewStageRepository.getById(id);

			if (result.isErr()) {
				throw new NotFoundError(`Error: ${result.error}`);
			}

			const stage = result.value;
			// Return just the stage card
			set.headers["Content-Type"] = "text/html";
			const stagesResult = await interviewStageRepository.getByJobApplicationId(
				stage.jobApplicationId,
			);
			return stagesResult.isOk()
				? renderInterviewStagesList(stagesResult.value, stage.jobApplicationId)
				: `Error: ${stagesResult.error}`;
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// GET /interview-stages/:id/edit - Returns edit form for interview stage
	.get(
		"/interview-stages/:id/edit",
		async ({ interviewStageRepository, params: { id }, set }) => {
			const result = await interviewStageRepository.getById(id);

			if (result.isErr()) {
				throw new NotFoundError(`Error: ${result.error}`);
			}

			set.headers["Content-Type"] = "text/html";
			return renderInterviewStageForm(
				result.value.jobApplicationId,
				result.value,
			);
		},
		{
			params: idParamSchema,
			response: type.string,
		},
	)
	// PUT /interview-stages/:id - Update interview stage
	.put(
		"/interview-stages/:id",
		async ({ interviewStageRepository, params: { id }, body, set }) => {
			// Transform form data
			const updates = {
				round: body.round,
				interviewType: body.interviewType,
				isFinalRound: body.isFinalRound ?? false,
				scheduledDate: body.scheduledDate || undefined,
				completedDate: body.completedDate || undefined,
				notes: body.notes,
				questions:
					body.questions?.map((q: { title: string; answer?: string }) => ({
						id: uuidProvider.generateUUID(),
						title: q.title,
						answer: q.answer,
					})) || [],
			};

			const result = await interviewStageRepository.update(id, updates);

			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const stagesResult = await interviewStageRepository.getByJobApplicationId(
				result.value.jobApplicationId,
			);
			return stagesResult.isOk()
				? renderInterviewStagesList(
						stagesResult.value,
						result.value.jobApplicationId,
					)
				: `Error: ${stagesResult.error}`;
		},
		{
			params: idParamSchema,
			body: formDataSchema.FormData,
		},
	)
	// DELETE /interview-stages/:id - Delete interview stage
	.delete(
		"/interview-stages/:id",
		async ({ interviewStageRepository, params: { id }, set }) => {
			// Get the stage first to know the job application ID
			const stageResult = await interviewStageRepository.getById(id);
			if (stageResult.isErr()) {
				set.status = 404;
				return `Error: ${stageResult.error}`;
			}

			const jobAppId = stageResult.value.jobApplicationId;

			const result = await interviewStageRepository.delete(id);
			if (result.isErr()) {
				set.status = 500;
				return `Error: ${result.error}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const stagesResult =
				await interviewStageRepository.getByJobApplicationId(jobAppId);
			return stagesResult.isOk()
				? renderInterviewStagesList(stagesResult.value, jobAppId)
				: `Error: ${stagesResult.error}`;
		},
		{
			params: idParamSchema,
		},
	);
