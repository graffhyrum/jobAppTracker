import { Elysia } from "elysia";

import { contactRepository } from "#src/infrastructure/factories/create-sqlite-contact-repo.ts";

export const contactRepositoryPlugin = new Elysia().decorate(
	"contactRepository",
	contactRepository,
);
