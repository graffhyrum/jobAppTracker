import { beforeEach, describe, expect, test } from "bun:test";
import {
	createDefaultPipelineConfig,
	pipelineConfigFromData,
} from "../../domain/entities/pipeline-config";
import type { PipelineConfigRepository } from "../../domain/ports/pipeline-config-repository";
import { createPipelineConfigMemoryRepository } from "./pipeline-config-memory-repository";

describe("PipelineConfigMemoryRepository", () => {
	let repository: PipelineConfigRepository;

	beforeEach(() => {
		repository = createPipelineConfigMemoryRepository();
	});

	test("should load default configuration by default", async () => {
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

	test("should use provided initial configuration", async () => {
		const initialConfig = pipelineConfigFromData({
			active: ["custom active"],
			inactive: ["custom inactive"],
		});

		const customRepository =
			createPipelineConfigMemoryRepository(initialConfig);

		const result = await customRepository.load();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const config = result.value;
		expect(config.active).toEqual(["custom active"]);
		expect(config.inactive).toEqual(["custom inactive"]);
	});

	test("should save and load configuration", async () => {
		const config = createDefaultPipelineConfig();
		config.addActiveStatus("new active");
		config.addInactiveStatus("new inactive");

		const saveResult = await repository.save(config);
		expect(saveResult.isOk()).toBe(true);

		const loadResult = await repository.load();
		expect(loadResult.isOk()).toBe(true);
		if (!loadResult.isOk()) return;

		const loadedConfig = loadResult.value;
		expect(loadedConfig.active).toContain("new active");
		expect(loadedConfig.inactive).toContain("new inactive");
	});

	test("should persist modifications between save and load", async () => {
		const config = createDefaultPipelineConfig();
		config.removeStatus("applied");

		await repository.save(config);

		const loadResult = await repository.load();
		expect(loadResult.isOk()).toBe(true);
		if (!loadResult.isOk()) return;

		const loadedConfig = loadResult.value;
		expect(loadedConfig.active).not.toContain("applied");
	});
});
