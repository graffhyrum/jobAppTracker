import { type } from "arktype";

export const statusCategorySchema = type("'active'|'inactive'");
export type StatusCategory = typeof statusCategorySchema.infer;

const activeStatuses =
	"'applied'|'screening interview'|'interview'|'onsite'|'online test'|'take-home assignment'|'offer'";
const inactiveStatuses =
	"'rejected'|'no response'|'no longer interested'|'hiring freeze'";

export const activeStatusSchema = type(activeStatuses);
export type ActiveStatus = typeof activeStatusSchema.infer;

export const inactiveStatusSchema = type(inactiveStatuses);
export type InactiveStatus = typeof inactiveStatusSchema.infer;

export const applicationStatusSchema = type(
	`${activeStatuses}|${inactiveStatuses}`,
);
export type ApplicationStatus = typeof applicationStatusSchema.infer;

export const interestRatingSchema = type("1|2|3");
export type InterestRating = typeof interestRatingSchema.infer;

export const companyNameSchema = type("string>0");
export type CompanyName = typeof companyNameSchema.infer;

export const positionTitleSchema = type("string>0");
export type PositionTitle = typeof positionTitleSchema.infer;
