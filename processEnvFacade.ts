import { type } from "arktype";
import "dotenv/config";

const schemaConfig = {
	BASE_URL: "string.url",
	PORT: type("string")
		.pipe((s) => Number(s))
		.to("number"),
} as const satisfies Parameters<typeof type>[0];

const processEnvSchema = type(schemaConfig);

// console.dir(
// 	Object.entries(process.env).filter(([k, _v]) =>
// 		Object.keys(schemaConfig).includes(k),
// 	),
// );

/**
 * The `processEnv` variable represents the validated and schema-checked
 * environment variables of the current Node.js process. It ensures that
 * the environment variables conform to the defined structure and types
 * specified in the `processEnvSchema`.
 *
 * This variable is typically used to access configuration values or settings
 * that are injected through environment variables during application runtime.
 *
 * The environment variables are validated using the `processEnvSchema`, and any
 * invalid or missing variables will trigger a validation error.
 */
export const processEnv = processEnvSchema.assert(process.env);
