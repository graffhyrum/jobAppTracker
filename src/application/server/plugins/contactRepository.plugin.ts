import { Elysia } from "elysia";
import { contactRepository } from "#src/domain/use-cases/create-sqlite-contact-repo.ts";

export const contactRepositoryPlugin = new Elysia().decorate(
	"contactRepository",
	contactRepository,
);
