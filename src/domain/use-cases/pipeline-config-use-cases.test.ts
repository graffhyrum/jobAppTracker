import { beforeEach, describe, expect, test } from "bun:test";
import { createPipelineConfigMemoryRepository } from "../../infrastructure/storage/pipeline-config-memory-repository";
import type { PipelineConfigUseCases } from "./pipeline-config-use-cases";
import { createPipelineConfigUseCases } from "./pipeline-config-use-cases";

describe("PipelineConfigUseCases", () => {
	let useCases: PipelineConfigUseCases;

	beforeEach(() => {
		const repository = createPipelineConfigMemoryRepository();
		useCases = createPipelineConfigUseCases(repository);
	});

	test("should get pipeline configuration", async () => {
		const result = await useCases.getPipelineConfig();
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		const config = result.value;
		expect(config.active.length).toBeGreaterThan(0);
		expect(config.inactive.length).toBeGreaterThan(0);
		expect(config.active).toContain("applied");
		expect(config.inactive).toContain("rejected");
	});

	test("should update pipeline configuration", async () => {
		const getResult = await useCases.getPipelineConfig();
		expect(getResult.isOk()).toBe(true);
		if (!getResult.isOk()) return;

		const config = getResult.value;
		config.addActiveStatus("new active status");

		const updateResult = await useCases.updatePipelineConfig(config);
		expect(updateResult.isOk()).toBe(true);

		const updatedResult = await useCases.getPipelineConfig();
		expect(updatedResult.isOk()).toBe(true);
		if (!updatedResult.isOk()) return;

		const updatedConfig = updatedResult.value;
		expect(updatedConfig.active).toContain("new active status");
	});

	test("should add active status", async () => {
		const result = await useCases.addActiveStatus("custom active");
		expect(result.isOk()).toBe(true);

		const configResult = await useCases.getPipelineConfig();
		expect(configResult.isOk()).toBe(true);
		if (!configResult.isOk()) return;

		const config = configResult.value;
		expect(config.active).toContain("custom active");
	});

	test("should add inactive status", async () => {
		const result = await useCases.addInactiveStatus("custom inactive");
		expect(result.isOk()).toBe(true);

		const configResult = await useCases.getPipelineConfig();
		expect(configResult.isOk()).toBe(true);
		if (!configResult.isOk()) return;

		const config = configResult.value;
		expect(config.inactive).toContain("custom inactive");
	});

	test("should remove status", async () => {
		const result = await useCases.removeStatus("applied");
		expect(result.isOk()).toBe(true);

		const configResult = await useCases.getPipelineConfig();
		expect(configResult.isOk()).toBe(true);
		if (!configResult.isOk()) return;

		const config = configResult.value;
		expect(config.active).not.toContain("applied");
	});

	test("should handle adding duplicate status gracefully", async () => {
		// Add it once
		await useCases.addActiveStatus("duplicate status");

		// Add it again
		const result = await useCases.addActiveStatus("duplicate status");
		expect(result.isOk()).toBe(true);

		const configResult = await useCases.getPipelineConfig();
		expect(configResult.isOk()).toBe(true);
		if (!configResult.isOk()) return;

		const config = configResult.value;
		const occurrences = config.active.filter(
			(status) => status === "duplicate status",
		);
		expect(occurrences).toHaveLength(1);
	});

	test("should handle removing non-existent status", async () => {
		const result = await useCases.removeStatus("non-existent status");
		// Should not throw error
		expect(result.isOk()).toBe(true);
	});
});
