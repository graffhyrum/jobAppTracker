import { expect } from "bun:test";
import type { Type } from "arktype";
import { toArkResult } from "#helpers/ark-results.ts";

// biome-ignore lint/suspicious/noExplicitAny: generic function
export function assertValidPerSchema<const ArkType extends Type<any, any>>(
	arkType: ArkType,
	input: unknown,
) {
	const res = toArkResult(arkType, input);
	expect(res.isOk()).toBe(true);
	return res._unsafeUnwrap();
}
