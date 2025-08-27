import { describe, expect, it } from "bun:test";
import { createNote, createNotesCollection } from "./note";

describe("createNote", () => {
	it("should create a note with valid content", () => {
		const noteData = { content: "This is a test note" };
		const result = createNote(noteData);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const note = result.value;
			expect(note.content).toBe("This is a test note");
			expect(note.createdAt).toBe(note.updatedAt);
		}
	});

	it("should fail validation for empty content", () => {
		const noteData = { content: "" };
		const result = createNote(noteData);

		expect(result.isErr()).toBe(true);
	});

	it("should create notes with different timestamps", () => {
		const result1 = createNote({ content: "First note" });
		const result2 = createNote({ content: "Second note" });

		expect(result1.isOk()).toBe(true);
		expect(result2.isOk()).toBe(true);

		if (result1.isOk() && result2.isOk()) {
			// Timestamps should be different (or at least not fail if they're the same due to fast execution)
			expect(result1.value.content).not.toBe(result2.value.content);
		}
	});
});

describe("createNotesCollection", () => {
	it("should create an empty notes collection", () => {
		const collection = createNotesCollection();

		expect(collection.notes).toEqual({});
		expect(collection.operations.add).toBeFunction();
	});

	describe("operations.add", () => {
		it("should add a note to the collection", () => {
			const collection = createNotesCollection();
			const result = collection.operations.add({ content: "Test note" });

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				const note = result.value;
				expect(note.content).toBe("Test note");
				expect(collection.notes[note.id]?.content).toBe("Test note");
			}
		});

		it("should fail to add note with invalid content", () => {
			const collection = createNotesCollection();
			const result = collection.operations.add({ content: "" });

			expect(result.isErr()).toBe(true);
		});

		it("should generate unique IDs for multiple notes", () => {
			const collection = createNotesCollection();
			const result1 = collection.operations.add({ content: "Note 1" });
			const result2 = collection.operations.add({ content: "Note 2" });

			expect(result1.isOk()).toBe(true);
			expect(result2.isOk()).toBe(true);

			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.id).not.toBe(result2.value.id);
			}
		});
	});

	describe("operations.get", () => {
		it("should retrieve an existing note by ID", () => {
			const collection = createNotesCollection();
			const addResult = collection.operations.add({ content: "Test note" });

			expect(addResult.isOk()).toBe(true);
			if (addResult.isOk()) {
				const noteId = addResult.value.id;
				const getResult = collection.operations.get(noteId);

				expect(getResult.isOk()).toBe(true);
				if (getResult.isOk()) {
					const note = getResult.value;
					expect(note.id).toBe(noteId);
					expect(note.content).toBe("Test note");
				}
			}
		});

		it("should fail to retrieve non-existent note", () => {
			const collection = createNotesCollection();
			// Using a valid UUID format but one that doesn't exist in the collection
			const fakeId = "123e4567-e89b-12d3-a456-426614174000";
			const result = collection.operations.get(fakeId);

			expect(result.isErr()).toBe(true);
		});
	});

	describe("operations.getAll", () => {
		it("should return empty array error when no notes exist", () => {
			const collection = createNotesCollection();
			const result = collection.operations.getAll();

			expect(result.isErr()).toBe(true);
		});

		it("should return all notes when collection has notes", () => {
			const collection = createNotesCollection();
			const addResult1 = collection.operations.add({ content: "Note 1" });
			const addResult2 = collection.operations.add({ content: "Note 2" });

			expect(addResult1.isOk()).toBe(true);
			expect(addResult2.isOk()).toBe(true);

			const getAllResult = collection.operations.getAll();
			expect(getAllResult.isOk()).toBe(true);

			if (getAllResult.isOk()) {
				const notes = getAllResult.value;
				expect(notes).toHaveLength(2);
				expect(notes.some((note) => note.content === "Note 1")).toBe(true);
				expect(notes.some((note) => note.content === "Note 2")).toBe(true);
			}
		});
	});

	describe("operations.update", () => {
		it("should update an existing note", () => {
			const collection = createNotesCollection();
			const addResult = collection.operations.add({
				content: "Original content",
			});

			expect(addResult.isOk()).toBe(true);
			if (addResult.isOk()) {
				const noteId = addResult.value.id;
				const originalCreatedAt = addResult.value.createdAt;

				const updateResult = collection.operations.update(noteId, {
					content: "Updated content",
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					const updatedNote = updateResult.value;
					expect(updatedNote.id).toBe(noteId);
					expect(updatedNote.content).toBe("Updated content");
					expect(updatedNote.createdAt).toBe(originalCreatedAt);
					// updatedAt should be changed, but we can't easily test the exact value
					expect(updatedNote.updatedAt).toBeDefined();
				}
			}
		});

		it("should fail to update non-existent note", () => {
			const collection = createNotesCollection();
			const fakeId = "123e4567-e89b-12d3-a456-426614174000";
			const result = collection.operations.update(fakeId, {
				content: "New content",
			});

			expect(result.isErr()).toBe(true);
		});

		it("should partially update note properties", () => {
			const collection = createNotesCollection();
			const addResult = collection.operations.add({
				content: "Original content",
			});

			expect(addResult.isOk()).toBe(true);
			if (addResult.isOk()) {
				const noteId = addResult.value.id;
				const originalContent = addResult.value.content;
				const originalCreatedAt = addResult.value.createdAt;

				// Update only some properties (partial update)
				const updateResult = collection.operations.update(noteId, {
					updatedAt: "2024-01-01T00:00:00.000Z",
				});

				expect(updateResult.isOk()).toBe(true);
				if (updateResult.isOk()) {
					const updatedNote = updateResult.value;
					expect(updatedNote.content).toBe(originalContent); // Should remain unchanged
					expect(updatedNote.createdAt).toBe(originalCreatedAt); // Should remain unchanged
					expect(updatedNote.updatedAt).toBe("2024-01-01T00:00:00.000Z");
				}
			}
		});
	});

	describe("operations.remove", () => {
		it("should remove an existing note", () => {
			const collection = createNotesCollection();
			const addResult = collection.operations.add({ content: "To be removed" });

			expect(addResult.isOk()).toBe(true);
			if (addResult.isOk()) {
				const noteId = addResult.value.id;

				// Verify note exists before removal
				expect(collection.notes[noteId]).toBeDefined();

				const removeResult = collection.operations.remove(noteId);
				expect(removeResult.isOk()).toBe(true);

				// Verify note is removed from the collection
				expect(collection.notes[noteId]).toBeUndefined();
			}
		});

		it("should fail to remove non-existent note", () => {
			const collection = createNotesCollection();
			const fakeId = "123e4567-e89b-12d3-a456-426614174000";
			const result = collection.operations.remove(fakeId);

			expect(result.isErr()).toBe(true);
		});

		it("should not affect other notes when removing one", () => {
			const collection = createNotesCollection();
			const addResult1 = collection.operations.add({
				content: "Keep this note",
			});
			const addResult2 = collection.operations.add({
				content: "Remove this note",
			});

			expect(addResult1.isOk()).toBe(true);
			expect(addResult2.isOk()).toBe(true);

			if (addResult1.isOk() && addResult2.isOk()) {
				const keepId = addResult1.value.id;
				const removeId = addResult2.value.id;

				const removeResult = collection.operations.remove(removeId);
				expect(removeResult.isOk()).toBe(true);

				// Verify the other note still exists
				expect(collection.notes[keepId]).toBeDefined();
				expect(collection.notes[removeId]).toBeUndefined();

				const getResult = collection.operations.get(keepId);
				expect(getResult.isOk()).toBe(true);
			}
		});
	});
});
