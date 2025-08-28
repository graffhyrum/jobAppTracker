import { describe, expect, test } from "bun:test";
import {
	createDefaultPipelineConfig,
	pipelineConfigFromData,
} from "./pipeline-config.ts";

describe("createDefaultPipelineConfig", () => {
	test("creates config with default active and inactive statuses", () => {
		const config = createDefaultPipelineConfig();

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

	test("returns immutable copies of status arrays", () => {
		const config = createDefaultPipelineConfig();
		const activeSnapshot = config.active;
		const inactiveSnapshot = config.inactive;

		// Modifying returned arrays shouldn't affect internal state
		activeSnapshot.push("new status");
		inactiveSnapshot.push("new status");

		expect(config.active).not.toContain("new status");
		expect(config.inactive).not.toContain("new status");
	});

	test("allows setting new active and inactive arrays", () => {
		const config = createDefaultPipelineConfig();

		config.active = ["new active"];
		config.inactive = ["new inactive"];

		expect(config.active).toEqual(["new active"]);
		expect(config.inactive).toEqual(["new inactive"]);
	});

	test("addActiveStatus adds unique status", () => {
		const config = createDefaultPipelineConfig();
		const initialCount = config.active.length;

		config.addActiveStatus("new status");

		expect(config.active).toContain("new status");
		expect(config.active).toHaveLength(initialCount + 1);
	});

	test("addActiveStatus trims status name", () => {
		const config = createDefaultPipelineConfig();

		config.addActiveStatus("  trimmed status  ");

		expect(config.active).toContain("trimmed status");
		expect(config.active).not.toContain("  trimmed status  ");
	});

	test("addActiveStatus throws error for empty status", () => {
		const config = createDefaultPipelineConfig();

		expect(() => config.addActiveStatus("")).toThrow(
			"Status name cannot be empty",
		);
		expect(() => config.addActiveStatus("   ")).toThrow(
			"Status name cannot be empty",
		);
	});

	test("addActiveStatus ignores duplicate statuses", () => {
		const config = createDefaultPipelineConfig();
		const initialCount = config.active.length;

		config.addActiveStatus("applied"); // already exists

		expect(config.active).toHaveLength(initialCount);
	});

	test("addInactiveStatus adds unique status", () => {
		const config = createDefaultPipelineConfig();
		const initialCount = config.inactive.length;

		config.addInactiveStatus("new status");

		expect(config.inactive).toContain("new status");
		expect(config.inactive).toHaveLength(initialCount + 1);
	});

	test("addInactiveStatus trims status name", () => {
		const config = createDefaultPipelineConfig();

		config.addInactiveStatus("  trimmed status  ");

		expect(config.inactive).toContain("trimmed status");
		expect(config.inactive).not.toContain("  trimmed status  ");
	});

	test("addInactiveStatus throws error for empty status", () => {
		const config = createDefaultPipelineConfig();

		expect(() => config.addInactiveStatus("")).toThrow(
			"Status name cannot be empty",
		);
		expect(() => config.addInactiveStatus("   ")).toThrow(
			"Status name cannot be empty",
		);
	});

	test("addInactiveStatus ignores duplicate statuses", () => {
		const config = createDefaultPipelineConfig();
		const initialCount = config.inactive.length;

		config.addInactiveStatus("rejected"); // already exists

		expect(config.inactive).toHaveLength(initialCount);
	});

	test("removeStatus removes from active statuses", () => {
		const config = createDefaultPipelineConfig();
		const initialCount = config.active.length;

		config.removeStatus("applied");

		expect(config.active).not.toContain("applied");
		expect(config.active).toHaveLength(initialCount - 1);
	});

	test("removeStatus removes from inactive statuses", () => {
		const config = createDefaultPipelineConfig();
		const initialCount = config.inactive.length;

		config.removeStatus("rejected");

		expect(config.inactive).not.toContain("rejected");
		expect(config.inactive).toHaveLength(initialCount - 1);
	});

	test("removeStatus throws error when removing last active status", () => {
		const config = createDefaultPipelineConfig();
		config.active = ["only status"];

		expect(() => config.removeStatus("only status")).toThrow(
			"Cannot remove the last active status",
		);
	});

	test("removeStatus throws error when removing last inactive status", () => {
		const config = createDefaultPipelineConfig();
		config.inactive = ["only status"];

		expect(() => config.removeStatus("only status")).toThrow(
			"Cannot remove the last inactive status",
		);
	});

	test("removeStatus does nothing for non-existent status", () => {
		const config = createDefaultPipelineConfig();
		const activeSnapshot = [...config.active];
		const inactiveSnapshot = [...config.inactive];

		config.removeStatus("non-existent");

		expect(config.active).toEqual(activeSnapshot);
		expect(config.inactive).toEqual(inactiveSnapshot);
	});

	test("toJSON returns serializable object", () => {
		const config = createDefaultPipelineConfig();
		const json = config.toJSON();

		expect(json).toEqual({
			active: config.active,
			inactive: config.inactive,
		});

		// Should be able to JSON.stringify
		expect(() => JSON.stringify(json)).not.toThrow();
	});

	test("toJSON returns immutable copies", () => {
		const config = createDefaultPipelineConfig();
		const json = config.toJSON();

		json.active.push("modified");
		json.inactive.push("modified");

		expect(config.active).not.toContain("modified");
		expect(config.inactive).not.toContain("modified");
	});
});

describe("pipelineConfigFromData", () => {
	test("creates config from valid data", () => {
		const data = {
			active: ["active1", "active2"],
			inactive: ["inactive1", "inactive2"],
		};

		const config = pipelineConfigFromData(data);

		expect(config.active).toEqual(data.active);
		expect(config.inactive).toEqual(data.inactive);
	});

	test("throws error for empty active array", () => {
		const data = {
			active: [],
			inactive: ["inactive1"],
		};

		expect(() => pipelineConfigFromData(data)).toThrow(
			"Active statuses cannot be empty",
		);
	});

	test("throws error for empty inactive array", () => {
		const data = {
			active: ["active1"],
			inactive: [],
		};

		expect(() => pipelineConfigFromData(data)).toThrow(
			"Inactive statuses cannot be empty",
		);
	});

	test("creates independent copy of input arrays", () => {
		const data = {
			active: ["active1"],
			inactive: ["inactive1"],
		};

		const config = pipelineConfigFromData(data);

		data.active.push("modified");
		data.inactive.push("modified");

		expect(config.active).not.toContain("modified");
		expect(config.inactive).not.toContain("modified");
	});

	test("supports all interface methods", () => {
		const data = {
			active: ["active1"],
			inactive: ["inactive1"],
		};

		const config = pipelineConfigFromData(data);

		// Test all methods work
		config.addActiveStatus("new active");
		config.addInactiveStatus("new inactive");
		config.removeStatus("active1");

		const json = config.toJSON();

		expect(config.active).toContain("new active");
		expect(config.inactive).toContain("new inactive");
		expect(config.active).not.toContain("active1");
		expect(json).toEqual({
			active: config.active,
			inactive: config.inactive,
		});
	});

	test("allows setting new active and inactive arrays", () => {
		const data = {
			active: ["initial active"],
			inactive: ["initial inactive"],
		};

		const config = pipelineConfigFromData(data);

		config.active = ["new active"];
		config.inactive = ["new inactive"];

		expect(config.active).toEqual(["new active"]);
		expect(config.inactive).toEqual(["new inactive"]);
	});

	test("removeStatus throws error when removing last active status from pipelineConfigFromData", () => {
		const config = pipelineConfigFromData({
			active: ["only status"],
			inactive: ["inactive1"],
		});

		expect(() => config.removeStatus("only status")).toThrow(
			"Cannot remove the last active status",
		);
	});

	test("removeStatus throws error when removing last inactive status from pipelineConfigFromData", () => {
		const config = pipelineConfigFromData({
			active: ["active1"],
			inactive: ["only status"],
		});

		expect(() => config.removeStatus("only status")).toThrow(
			"Cannot remove the last inactive status",
		);
	});

	test("removeStatus successfully removes inactive status from pipelineConfigFromData", () => {
		const config = pipelineConfigFromData({
			active: ["active1"],
			inactive: ["status1", "status2"],
		});

		const initialCount = config.inactive.length;
		config.removeStatus("status1");

		expect(config.inactive).not.toContain("status1");
		expect(config.inactive).toHaveLength(initialCount - 1);
		expect(config.inactive).toContain("status2");
	});
});
