import { expect, test } from "bun:test";
import { type } from "arktype";
import { createBunUUIDGeneration } from "./bun-uuid-generation.ts";
import { createNodeUUIDGeneration } from "./node-uuid-generation.ts";
import type { UUIDGeneration } from "./uuid-generation.ts";

const generators = [
	createBunUUIDGeneration,
	createNodeUUIDGeneration,
] as const satisfies Array<() => UUIDGeneration>;

for (const generator of generators) {
	test(`${generator.name} uuid generation`, () => {
		const id = generator().generateUUID();
		const res = type("string.uuid")(id);
		expect(typeof res).toBe("string");
	});
}
