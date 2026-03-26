import { type } from "arktype";

const schemaConfig = {
	BASE_URL: "string.url",
	PORT: type("string")
		.pipe((s) => Number(s))
		.to("number"),
	JOB_APP_MANAGER_TYPE: ' "test" | "prod"',
	"BROWSER_EXTENSION_API_KEY?": "string > 0",
} as const satisfies Parameters<typeof type>[0];

const processEnvSchema = type(schemaConfig);
export type ProcessEnvSchema = typeof processEnvSchema.infer;

export const processEnv = processEnvSchema.assert(process.env);
