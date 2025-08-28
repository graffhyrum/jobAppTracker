import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createDefaultPipelineConfig,
	pipelineConfigFromData,
} from "../../domain/entities/pipeline-config";
import type { PipelineConfigRepository } from "../../domain/ports/pipeline-config-repository";
import { createPipelineConfigJsonRepository } from "./pipeline-config-json-repository";

describe("PipelineConfigJsonRepository", () => {
	let repository: PipelineConfigRepository;
	let testFilePath: string;

	beforeEach(() => {
		testFilePath = join(tmpdir(), `test-pipeline-config-${Date.now()}.json`);
		repository = createPipelineConfigJsonRepository(testFilePath);
	});

	afterEach(() => {
		if (existsSync(testFilePath)) {
			unlinkSync(testFilePath);
		}
	});

	test("should load default config when file doesn't exist", async () => {
		const result = await repository.load();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const config = result.value;
		expect(config.active).toEqual([
			"applied",
			"screening interview",
			"interview",
			"onsite",
			"online test",
			"take-home assignment",
			"offer",
		]);
		expect(config.inactive).toEqual([
			"rejected",
			"no response",
			"no longer interested",
			"hiring freeze",
		]);
	});

	test("should save and load pipeline configuration", async () => {
		const defaultConfig = createDefaultPipelineConfig();
		defaultConfig.addActiveStatus("final interview");
		defaultConfig.addInactiveStatus("withdrawn");

		const saveResult = await repository.save(defaultConfig);
		expect(saveResult.isOk()).toBe(true);

		// Verify file was created
		expect(existsSync(testFilePath)).toBe(true);

		const loadResult = await repository.load();
		expect(loadResult.isOk()).toBe(true);
		if (!loadResult.isOk()) return;

		const loadedConfig = loadResult.value;
		expect(loadedConfig.active).toContain("final interview");
		expect(loadedConfig.inactive).toContain("withdrawn");
	});

	test("should preserve original statuses when loading from file", async () => {
		const customConfig = pipelineConfigFromData({
			active: ["custom active"],
			inactive: ["custom inactive"],
		});

		await repository.save(customConfig);

		const loadResult = await repository.load();
		expect(loadResult.isOk()).toBe(true);
		if (!loadResult.isOk()) return;

		const loadedConfig = loadResult.value;
		expect(loadedConfig.active).toEqual(["custom active"]);
		expect(loadedConfig.inactive).toEqual(["custom inactive"]);
	});

	test("should handle empty file gracefully", async () => {
		// Create empty file
		await Bun.write(testFilePath, "");

		const result = await repository.load();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		// Should return default config for empty file
		const config = result.value;
		expect(config.active.length).toBeGreaterThan(0);
		expect(config.inactive.length).toBeGreaterThan(0);
	});

	test("should handle malformed JSON gracefully", async () => {
		// Create malformed JSON file
		await Bun.write(testFilePath, "{ invalid json");

		const result = await repository.load();
		expect(result.isErr()).toBe(true);
	});

	test("should save modifications correctly", async () => {
		const config = createDefaultPipelineConfig();
		config.removeStatus("applied");
		config.addActiveStatus("new status");

		await repository.save(config);

		const loadResult = await repository.load();
		expect(loadResult.isOk()).toBe(true);
		if (!loadResult.isOk()) return;

		const loadedConfig = loadResult.value;
		expect(loadedConfig.active).not.toContain("applied");
		expect(loadedConfig.active).toContain("new status");
	});
});
