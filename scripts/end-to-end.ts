import find from "find-process";
import { ResultAsync } from "neverthrow";
import kill from "tree-kill";
import { processEnv } from "../processEnvFacade.ts";

const baseURL = `${processEnv.BASE_URL}:${processEnv.PORT}`;

await main();

async function main() {
	prepareEnvironment();
	const devServerProc = await findOrStartDevServer();
	console.time("pollDevServer");
	await pollDevServer();
	console.timeEnd("pollDevServer");

	// Pass through all command line arguments to Playwright
	// Use bunx to run Playwright with Bun's runtime to support bun:sqlite
	const playwrightArgs = ["playwright", "test", ...process.argv.slice(2)];

	const e2e = Bun.spawnSync(["bunx", ...playwrightArgs], {
		stdout: "inherit",
		stderr: "inherit",
		onExit(_proc, _exitCode, _signalCode, _error): void | Promise<void> {
			if ("kill" in devServerProc) {
				devServerProc.kill();
			} else {
				kill(devServerProc.pid);
			}
		},
	});
	process.exit(e2e.exitCode);
}

function prepareEnvironment() {
	Bun.spawnSync(["bun", "install"]);
	Bun.spawnSync(["bunx", "playwright", "install", "--with-deps"]);
}

function findOrStartDevServer() {
	const findDevServer = ResultAsync.fromThrowable(
		find,
		(e) => new Error(`Failed to find dev server: ${e}`),
	);

	return findDevServer("port", processEnv.PORT).match(
		(procList) => {
			const match = procList.find(
				(proc) => proc.name === "bun" && proc.cmd.includes("start"),
			);
			if (match) {
				console.log(`Dev server already running. PID: ${match.pid}`);
				return match;
			}
			console.log("Dev server not found. Starting new server");
			return startDevServer();
		},
		() => {
			console.log("Starting dev server");
			return startDevServer();
		},
	);
}

function startDevServer() {
	return Bun.spawn(["bun", "start"], {
		stdout: "inherit",
		stderr: "inherit",
		env: {
			...process.env,
			NODE_ENV: "development", // Enable dev tools for E2E testing
		},
	});
}

async function pollDevServer(
	startTime = Date.now(),
	timeoutDuration = 10 * 1000,
): Promise<void> {
	try {
		await fetch(baseURL);
	} catch (e) {
		if (Date.now() - startTime >= timeoutDuration) {
			throw new Error(`Server did not connect within timeout. ${e}`);
		}
		await Bun.sleep(50);
		return pollDevServer(startTime, timeoutDuration);
	}
}
