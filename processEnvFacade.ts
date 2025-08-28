/**
 * ProcessEnvFacade is an object that provides methods to interact with environment variables.
 * It provides methods to get, set, and validate environment variables.
 */
const ProcessEnvFacade = {
	getValueOrThrow: (key: keyof NodeJS.ProcessEnv): string => {
		const maybeKey = process.env[key];
		if (!maybeKey) {
			throw new Error(`Environment variable ${key} is not set`);
		}
		return maybeKey;
	},

	getValueOrExit: (key: keyof NodeJS.ProcessEnv): string => {
		const maybeKey = process.env[key];
		if (!maybeKey) {
			console.error(`Environment variable ${key} is not set`);
			process.exit(1);
		}
		return maybeKey;
	},

	getValue: (key: keyof NodeJS.ProcessEnv): string | undefined =>
		process.env[key],

	setValue: (key: keyof NodeJS.ProcessEnv, value: string) => {
		process.env[key] = value;
	},
};

export default ProcessEnvFacade;
