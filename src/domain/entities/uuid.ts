import { type } from "arktype";

export const uuidSchema = type("string.uuid");
export type UUID = typeof uuidSchema.infer;
