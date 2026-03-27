import { ArkErrors } from "arktype";
import { Either } from "effect";

import { getEntries } from "../../../types/entries.ts";
import { NonEmptyString } from "./non-empty-string.ts";
import {
	type Note,
	type NoteCollection,
	type NoteForCreate,
	type NoteId,
	type NoteProps,
	type NotesCollection,
	noteModule,
} from "./noteScope.ts";
export function createNotesCollectionManager(
	generateId: () => NoteId,
	collection: NoteCollection = {},
): NotesCollection {
	return {
		notes: collection,
		operations: {
			get(id: NoteId) {
				const maybeNote = collection[id];
				if (maybeNote) {
					return Either.right({ id, ...maybeNote });
				}
				return Either.left(new Error(`No Note with Id: ${id}`));
			},
			getAll(): Either.Either<Note[], Error> {
				const entries = Array.from(getEntries(collection));
				return Either.right(entries.map(([id, data]) => ({ id, ...data })));
			},
			add({ content }) {
				const noteResult = createNote({ content });
				if (Either.isLeft(noteResult)) {
					return Either.left(noteResult.left);
				}
				const newNote = noteResult.right;
				const id = generateId();
				collection[id] = newNote;
				return Either.right({ id, ...newNote });
			},
			update(id, data) {
				const maybeNote = collection[id];
				if (!maybeNote)
					return Either.left(new Error(`No note to update with id ${id}`));
				if (data.content !== undefined) {
					const validated = NonEmptyString(data.content);
					if (validated instanceof ArkErrors) {
						return Either.left(
							new Error("Note content validation failed", {
								cause: validated,
							}),
						);
					}
				}
				const { updatedAt: _ignored, ...rest } = data;
				const newContent: NoteProps = {
					...maybeNote,
					...rest,
					updatedAt: new Date().toISOString(),
				};
				collection[id] = newContent;
				return Either.right({ id, ...newContent });
			},
			remove(id) {
				const hasNote = collection[id] !== undefined;
				if (hasNote) {
					delete collection[id];
					return Either.right(undefined as void);
				}
				return Either.left(new Error(`No note with id: ${id}`));
			},
		},
	};
}
export function createNote({
	content,
}: NoteForCreate): Either.Either<NoteProps, Error> {
	const now = new Date().toISOString();
	const newNote = noteModule.NoteProps({
		content: content,
		createdAt: now,
		updatedAt: now,
	});
	if (newNote instanceof ArkErrors) {
		return Either.left(new Error("Note validation failed", { cause: newNote }));
	}
	return Either.right(newNote);
}
