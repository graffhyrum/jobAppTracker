import type { ApplicationStatus } from "../../domain/entities/job-application";
import type { NoteProps } from "../../domain/entities/noteScope";

/**
 * Type-safe serializable representation for status log
 */
export type SerializableStatusLog = Record<string, ApplicationStatus>;

/**
 * Type-safe serializable representation for notes collection
 */
export type SerializableNotesCollection = Record<string, NoteProps>;

/**
 * Generic type for serializable job application data
 */
export interface SerializableJobApplication {
	id: string;
	company: string;
	positionTitle: string;
	applicationDate: string;
	createdAt: string;
	updatedAt: string;
	interestRating?: 1 | 2 | 3;
	nextEventDate?: string;
	jobPostingUrl?: string;
	jobDescription?: string;
	statusLog: SerializableStatusLog;
	notes: SerializableNotesCollection;
}

/**
 * Serializable representation of PipelineConfig for JSON storage
 */
export interface SerializablePipelineConfig {
	active: string[];
	inactive: string[];
}
