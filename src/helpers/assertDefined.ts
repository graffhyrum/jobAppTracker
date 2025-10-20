import { expect } from "bun:test";

export function assertDefined<T>(x: T): asserts x is NonNullable<T> {
	expect(x).toBeDefined();
}
