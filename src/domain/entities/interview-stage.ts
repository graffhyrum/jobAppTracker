import { ArkErrors, scope } from "arktype";
import { Either } from "effect";

import { InterviewStageError } from "./interview-stage-error.ts";
import { uuidSchema } from "./uuid.ts";
export const interviewStageScope = scope({
	"#dateTime": "string.date.iso",
	InterviewStageId: uuidSchema,
	JobAppId: uuidSchema,
	InterviewType:
		"'phone screening'|'technical'|'behavioral'|'onsite'|'panel'|'other'",
	Question: {
		id: uuidSchema,
		title: "string > 0",
		"answer?": "string",
	},
	BaseProps: {
		jobApplicationId: "JobAppId",
		round: "number >= 1",
		interviewType: "InterviewType",
		isFinalRound: "boolean",
		"scheduledDate?": "dateTime | ''",
		"completedDate?": "dateTime | ''",
		"notes?": "string",
		questions: "Question[]",
	},
	InterviewStage: {
		"...": "BaseProps",
		id: "InterviewStageId",
		createdAt: "dateTime",
		updatedAt: "dateTime",
	},
	forCreate: "BaseProps",
	forUpdate: "Partial<Omit<InterviewStage, 'id'>>",
});
export const interviewStageModule = interviewStageScope.export();
export type InterviewStageId =
	typeof interviewStageModule.InterviewStageId.infer;
export type InterviewType = typeof interviewStageModule.InterviewType.infer;
export type Question = typeof interviewStageModule.Question.infer;
export type InterviewStage = typeof interviewStageModule.InterviewStage.infer;
export type InterviewStageForCreate =
	typeof interviewStageModule.forCreate.infer;
export type InterviewStageForUpdate =
	typeof interviewStageModule.forUpdate.infer;
export function createInterviewStage(
	data: InterviewStageForCreate,
	generateUUID: () => string,
): Either.Either<InterviewStage, InterviewStageError> {
	const now = new Date().toISOString();
	const id = createInterviewStageId(generateUUID);
	const stage = interviewStageModule.InterviewStage({
		...data,
		id,
		createdAt: now,
		updatedAt: now,
	});
	if (stage instanceof ArkErrors) {
		return Either.left(
			new InterviewStageError({
				detail: stage.summary,
				operation: "createInterviewStage",
			}),
		);
	}
	return Either.right(stage);
}
export function createInterviewStageId(
	generateUUID: () => string,
): InterviewStageId {
	return interviewStageModule.InterviewStageId.assert(generateUUID());
}
export function updateInterviewStage(
	stage: InterviewStage,
	updates: InterviewStageForUpdate,
): InterviewStage {
	return {
		...stage,
		...updates,
		updatedAt: new Date().toISOString(),
	};
}
