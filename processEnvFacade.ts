import { type } from "arktype";
import "dotenv/config";

const schemaConfig = {
	BASE_URL: "string.url",
	PORT: type("string")
		.pipe((s) => Number(s))
		.to("number"),
	JOB_APP_MANAGER_TYPE: ' "test" | "prod"',
} as const satisfies Parameters<typeof type>[0];

const processEnvSchema = type(schemaConfig);
export type ProcessEnvSchema = typeof processEnvSchema.infer;

// console.dir(
// 	Object.entries(process.env).filter(([k, _v]) =>
// 		Object.keys(schemaConfig).includes(k),
// 	),
// );

export const processEnv = processEnvSchema.assert(process.env);
