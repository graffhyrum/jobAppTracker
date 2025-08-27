import { scope } from "arktype";
import type { Result } from "neverthrow";
import { NonEmptyString } from "./non-empty-string.ts";

export const noteScope = scope({
	NoteId: "string.uuid",
	NoteProps: {
		content: NonEmptyString,
		createdAt: "string.date.iso",
		updatedAt: "string.date.iso",
	},
	Note: {
		"...": "NoteProps",
		id: "NoteId",
	},
	NoteForCreate: "Pick<NoteProps,'content'>",
	NoteForUpdate: "Partial<NoteProps>",
});
export const noteModule = noteScope.export();
export type NoteId = typeof noteModule.NoteId.infer;
export type Note = typeof noteModule.Note.infer;
export type NoteProps = typeof noteModule.NoteProps.infer;
export type NoteForCreate = typeof noteModule.NoteForCreate.infer;
type NoteForUpdate = typeof noteModule.NoteForUpdate.infer;
export type NoteCollection = Record<NoteId, NoteProps>;
export type NotesCollection = {
	notes: NoteCollection;
	operations: NoteCollectionOperations;
};

interface NoteCollectionOperations {
	get(id: NoteId): Result<Note, Error>;

	getAll(): Result<Note[], Error>;

	add(data: NoteForCreate): Result<Note, Error>;

	update(id: NoteId, data: NoteForUpdate): Result<Note, Error>;

	remove(id: NoteId): Result<void, Error>;
}
