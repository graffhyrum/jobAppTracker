import { describe, expect, it } from "bun:test";
import { Either } from "effect";

import { assertDefined } from "#helpers/assertDefined.ts";

import { createNote, createNotesCollectionManager } from "./note";
import { type NoteId, noteModule } from "./noteScope.ts";

function makeMockIdGenerator(): () => NoteId {
	let counter = 0;
	return () => {
		const hex = (counter++).toString(16).padStart(12, "0");
		return noteModule.NoteId.assert(`00000000-0000-4000-8000-${hex}`);
	};
}

describe("createNote", () => {
	it("should create a note with valid content", () => {
		const noteData = { content: "This is a test note" };
		const result = createNote(noteData);

		expect(Either.isRight(result)).toBe(true);
		if (Either.isRight(result)) {
			const note = result.right;
			expect(note.content).toBe("This is a test note");
			expect(note.createdAt).toBe(note.updatedAt);
		}
	});

	it("should fail validation for empty content", () => {
		const noteData = { content: "" };
		const result = createNote(noteData);

		expect(Either.isLeft(result)).toBe(true);
	});

	it("should create notes with different timestamps", () => {
		const result1 = createNote({ content: "First note" });
		const result2 = createNote({ content: "Second note" });

		expect(Either.isRight(result1)).toBe(true);
		expect(Either.isRight(result2)).toBe(true);

		if (Either.isRight(result1) && Either.isRight(result2)) {
			expect(result1.right.content).not.toBe(result2.right.content);
		}
	});
});

describe("createNotesCollection", () => {
	it("should create an empty notes collection", () => {
		const collection = createNotesCollectionManager(makeMockIdGenerator());

		expect(collection.notes).toEqual({});
		expect(collection.operations.add).toBeFunction();
	});

	describe("operations.add", () => {
		it("should add a note to the collection", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const result = collection.operations.add({ content: "Test note" });

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const note = result.right;
				expect(note.content).toBe("Test note");
				expect(collection.notes[note.id]?.content).toBe("Test note");
			}
		});

		it("should fail to add note with invalid content", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const result = collection.operations.add({ content: "" });

			expect(Either.isLeft(result)).toBe(true);
		});

		it("regression: add() returns Left on invalid content without throwing", () => {
			const fixedId = noteModule.NoteId.assert(
				"00000000-0000-4000-8000-000000000099",
			);
			const collection = createNotesCollectionManager(() => fixedId);

			// Success path: valid content returns Right without throwing
			const okResult = collection.operations.add({ content: "Valid note" });
			expect(Either.isRight(okResult)).toBe(true);

			// Failure path: invalid content returns Left without throwing
			const errResult = collection.operations.add({ content: "" });
			expect(Either.isLeft(errResult)).toBe(true);
		});

		it("should generate unique IDs for multiple notes", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const result1 = collection.operations.add({ content: "Note 1" });
			const result2 = collection.operations.add({ content: "Note 2" });

			expect(Either.isRight(result1)).toBe(true);
			expect(Either.isRight(result2)).toBe(true);

			if (Either.isRight(result1) && Either.isRight(result2)) {
				expect(result1.right.id).not.toBe(result2.right.id);
			}
		});
	});

	describe("operations.get", () => {
		it("should retrieve an existing note by ID", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const addResult = collection.operations.add({ content: "Test note" });

			expect(Either.isRight(addResult)).toBe(true);
			if (Either.isRight(addResult)) {
				const noteId = addResult.right.id;
				const getResult = collection.operations.get(noteId);

				expect(Either.isRight(getResult)).toBe(true);
				if (Either.isRight(getResult)) {
					const note = getResult.right;
					expect(note.id).toBe(noteId);
					expect(note.content).toBe("Test note");
				}
			}
		});

		it("should fail to retrieve non-existent note", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const fakeId = "123e4567-e89b-12d3-a456-426614174000";
			const result = collection.operations.get(fakeId);

			expect(Either.isLeft(result)).toBe(true);
		});
	});

	describe("operations.getAll", () => {
		it("should return empty array error when no notes exist", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const result = collection.operations.getAll();

			expect(Either.isLeft(result)).toBe(true);
		});

		it("should return all notes when collection has notes", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const addResult1 = collection.operations.add({ content: "Note 1" });
			const addResult2 = collection.operations.add({ content: "Note 2" });

			expect(Either.isRight(addResult1)).toBe(true);
			expect(Either.isRight(addResult2)).toBe(true);

			const getAllResult = collection.operations.getAll();
			expect(Either.isRight(getAllResult)).toBe(true);

			if (Either.isRight(getAllResult)) {
				const notes = getAllResult.right;
				expect(notes).toHaveLength(2);
				expect(notes.some((note) => note.content === "Note 1")).toBe(true);
				expect(notes.some((note) => note.content === "Note 2")).toBe(true);
			}
		});
	});

	describe("operations.update", () => {
		it("should update an existing note", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const addResult = collection.operations.add({
				content: "Original content",
			});

			expect(Either.isRight(addResult)).toBe(true);
			if (Either.isRight(addResult)) {
				const noteId = addResult.right.id;
				const originalCreatedAt = addResult.right.createdAt;

				const updateResult = collection.operations.update(noteId, {
					content: "Updated content",
				});

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					const updatedNote = updateResult.right;
					expect(updatedNote.id).toBe(noteId);
					expect(updatedNote.content).toBe("Updated content");
					expect(updatedNote.createdAt).toBe(originalCreatedAt);
					assertDefined(updatedNote.updatedAt);
				}
			}
		});

		it("should fail to update non-existent note", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const fakeId = "123e4567-e89b-12d3-a456-426614174000";
			const result = collection.operations.update(fakeId, {
				content: "New content",
			});

			expect(Either.isLeft(result)).toBe(true);
		});

		it("should partially update note properties", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const addResult = collection.operations.add({
				content: "Original content",
			});

			expect(Either.isRight(addResult)).toBe(true);
			if (Either.isRight(addResult)) {
				const noteId = addResult.right.id;
				const originalContent = addResult.right.content;
				const originalCreatedAt = addResult.right.createdAt;

				const updateResult = collection.operations.update(noteId, {
					updatedAt: "2024-01-01T00:00:00.000Z",
				});

				expect(Either.isRight(updateResult)).toBe(true);
				if (Either.isRight(updateResult)) {
					const updatedNote = updateResult.right;
					expect(updatedNote.content).toBe(originalContent);
					expect(updatedNote.createdAt).toBe(originalCreatedAt);
					expect(updatedNote.updatedAt).toBe("2024-01-01T00:00:00.000Z");
				}
			}
		});
	});

	describe("operations.remove", () => {
		it("should remove an existing note", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const addResult = collection.operations.add({ content: "To be removed" });

			expect(Either.isRight(addResult)).toBe(true);
			if (Either.isRight(addResult)) {
				const noteId = addResult.right.id;

				assertDefined(collection.notes[noteId]);

				const removeResult = collection.operations.remove(noteId);
				expect(Either.isRight(removeResult)).toBe(true);

				expect(collection.notes[noteId]).toBeUndefined();
			}
		});

		it("should fail to remove non-existent note", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const fakeId = "123e4567-e89b-12d3-a456-426614174000";
			const result = collection.operations.remove(fakeId);

			expect(Either.isLeft(result)).toBe(true);
		});

		it("should not affect other notes when removing one", () => {
			const collection = createNotesCollectionManager(makeMockIdGenerator());
			const addResult1 = collection.operations.add({
				content: "Keep this note",
			});
			const addResult2 = collection.operations.add({
				content: "Remove this note",
			});

			expect(Either.isRight(addResult1)).toBe(true);
			expect(Either.isRight(addResult2)).toBe(true);

			if (Either.isRight(addResult1) && Either.isRight(addResult2)) {
				const keepId = addResult1.right.id;
				const removeId = addResult2.right.id;

				const removeResult = collection.operations.remove(removeId);
				expect(Either.isRight(removeResult)).toBe(true);

				assertDefined(collection.notes[keepId]);
				expect(collection.notes[removeId]).toBeUndefined();

				const getResult = collection.operations.get(keepId);
				expect(Either.isRight(getResult)).toBe(true);
			}
		});
	});
});
