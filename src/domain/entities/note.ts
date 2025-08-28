import { ArkErrors } from "arktype";
import { err, ok, type Result } from "neverthrow";
import { getEntries } from "../../helpers/entries.ts";
import {
	type Note,
	type NoteCollection,
	type NoteForCreate,
	type NoteId,
	type NoteProps,
	type NotesCollection,
	noteModule,
} from "./noteScope.ts";

function getNewNoteId(): NoteId {
	return noteModule.NoteId.assert(Bun.randomUUIDv7());
}

export function createNote({
	content,
}: NoteForCreate): Result<NoteProps, Error> {
	const now = new Date();
	const newNote = noteModule.NoteProps({
		content: content,
		createdAt: now.toISOString(),
		updatedAt: now.toISOString(),
	});
	if (newNote instanceof ArkErrors) {
		return err(new Error("Note validation failed", { cause: newNote }));
	} else {
		return ok(newNote);
	}
}

export function createNotesCollection(): NotesCollection {
	const collection: NoteCollection = {};

	return {
		notes: collection,
		operations: {
			get(id: NoteId) {
				const maybeNote = collection[id];
				if (maybeNote) {
					return ok({ id, ...maybeNote });
				} else {
					return err(new Error(`No Note with Id: ${id}`));
				}
			},
			getAll(): Result<Note[], Error> {
				const maybeNotes = Array.from(getEntries(collection));
				if (maybeNotes.length > 0) {
					return ok(
						maybeNotes.map(([id, data]) => {
							return { id, ...data };
						}),
					);
				} else {
					return err(new Error("No notes in collection"));
				}
			},
			add({ content }) {
				return createNote({ content }).map((newNote) => {
					const id = getNewNoteId();
					collection[id] = newNote;
					return {
						id,
						...newNote,
					};
				});
			},
			update(id, data) {
				const maybeNote = collection[id];
				if (!maybeNote)
					return err(new Error(`No note to update with id ${id}`));
				const newContent = {
					...maybeNote,
					...data,
				};
				collection[id] = newContent;
				return ok({
					id,
					...newContent,
				});
			},
			remove(id) {
				const hasNote = collection[id] !== undefined;
				if (hasNote) {
					delete collection[id];
					return ok();
				} else {
					return err(new Error(`No note with id: ${id}`));
				}
			},
		},
	};
}
