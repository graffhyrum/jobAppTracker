import type { JsonObject } from "@ark/util";

export type ForUpdate<T extends JsonObject> = Partial<T>;
