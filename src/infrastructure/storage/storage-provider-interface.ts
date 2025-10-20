import type { JsonObject } from "@ark/util";
import type { ResultAsync } from "neverthrow";
import type { UUID } from "../../domain/entities/uuid.ts";

export type Storable<T extends JsonObject = JsonObject> = T & {
	id: UUID;
};
export type ForCreate<T extends JsonObject> = Omit<T, "id">;
export type ForUpdate<T extends JsonObject> = Partial<T>;

/*
Storage Layer handles IDs
*/

export type StorageProvider<
	T extends JsonObject,
	ST extends Storable<T> = Storable<T>,
> = {
	add(data: ST): ResultAsync<ST, string>;
	get(id: UUID): ResultAsync<ST, string>;
	update(id: UUID, data: ForUpdate<ST>): ResultAsync<ST, string>;
	remove(id: UUID): ResultAsync<void, string>;
	getAll(): ResultAsync<ST[], string>;
	clear(): ResultAsync<void, string>;
};
