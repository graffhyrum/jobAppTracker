import { scope, type } from "arktype";
import { Either } from "effect";
import { Elysia, NotFoundError } from "elysia";

import { interviewStageRepositoryPlugin } from "#src/application/server/plugins/interviewStageRepository.plugin.ts";
import { runEffect } from "#src/application/server/utils/run-effect.ts";
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
			const result = await runEffect(
				interviewStageRepository.getByJobApplicationId(appId),
			);

			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${result.left.detail}`;
			}

			set.headers["Content-Type"] = "text/html";
			return renderInterviewStagesList(result.right, appId);
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

			const result = await runEffect(
				interviewStageRepository.create(stageData),
			);

			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${result.left.detail}`;
			}

			// Return the new stage card
			set.headers["Content-Type"] = "text/html";
			const stages = await runEffect(
				interviewStageRepository.getByJobApplicationId(appId),
			);
			return Either.isRight(stages)
				? renderInterviewStagesList(stages.right, appId)
				: `Error: ${stages.left.detail}`;
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
			const result = await runEffect(interviewStageRepository.getById(id));

			if (Either.isLeft(result)) {
				throw new NotFoundError(`Error: ${result.left.detail}`);
			}

			const stage = result.right;
			// Return just the stage card
			set.headers["Content-Type"] = "text/html";
			const stagesResult = await runEffect(
				interviewStageRepository.getByJobApplicationId(stage.jobApplicationId),
			);
			return Either.isRight(stagesResult)
				? renderInterviewStagesList(stagesResult.right, stage.jobApplicationId)
				: `Error: ${stagesResult.left.detail}`;
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
			const result = await runEffect(interviewStageRepository.getById(id));

			if (Either.isLeft(result)) {
				throw new NotFoundError(`Error: ${result.left.detail}`);
			}

			set.headers["Content-Type"] = "text/html";
			return renderInterviewStageForm(
				result.right.jobApplicationId,
				result.right,
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

			const result = await runEffect(
				interviewStageRepository.update(id, updates),
			);

			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${result.left.detail}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const stagesResult = await runEffect(
				interviewStageRepository.getByJobApplicationId(
					result.right.jobApplicationId,
				),
			);
			return Either.isRight(stagesResult)
				? renderInterviewStagesList(
						stagesResult.right,
						result.right.jobApplicationId,
					)
				: `Error: ${stagesResult.left.detail}`;
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
			const stageResult = await runEffect(interviewStageRepository.getById(id));
			if (Either.isLeft(stageResult)) {
				set.status = 404;
				return `Error: ${stageResult.left.detail}`;
			}

			const jobAppId = stageResult.right.jobApplicationId;

			const result = await runEffect(interviewStageRepository.delete(id));
			if (Either.isLeft(result)) {
				set.status = 500;
				return `Error: ${result.left.detail}`;
			}

			// Return updated list
			set.headers["Content-Type"] = "text/html";
			const stagesListResult = await runEffect(
				interviewStageRepository.getByJobApplicationId(jobAppId),
			);
			return Either.isRight(stagesListResult)
				? renderInterviewStagesList(stagesListResult.right, jobAppId)
				: `Error: ${stagesListResult.left.detail}`;
		},
		{
			params: idParamSchema,
		},
	);
