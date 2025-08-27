import { type } from "arktype";
import { NonEmptyString } from "./non-empty-string.ts";

export interface PipelineConfig {
	active: string[];
	inactive: string[];
	addActiveStatus: (status: string) => void;
	addInactiveStatus: (status: string) => void;
	removeStatus: (status: string) => void;
	toJSON: () => {
		active: string[];
		inactive: string[];
	};
}

function validateStatusName(status: string): string {
	const validation = NonEmptyString(status.trim());
	if (validation instanceof type.errors) {
		throw new Error("Status name cannot be empty");
	}
	return validation;
}

export function createDefaultPipelineConfig(): PipelineConfig {
	const defaultActive: string[] = [
		"applied",
		"screening interview",
		"interview",
		"onsite",
		"online test",
		"take-home assignment",
		"offer",
	];

	const defaultInactive: string[] = [
		"rejected",
		"no response",
		"no longer interested",
		"hiring freeze",
	];

	let mutableActive = [...defaultActive];
	let mutableInactive = [...defaultInactive];

	return {
		get active() {
			return [...mutableActive];
		},
		set active(value: string[]) {
			mutableActive = [...value];
		},
		get inactive() {
			return [...mutableInactive];
		},
		set inactive(value: string[]) {
			mutableInactive = [...value];
		},

		addActiveStatus(status: string): void {
			const validStatus = validateStatusName(status);
			if (!mutableActive.includes(validStatus)) {
				mutableActive.push(validStatus);
			}
		},

		addInactiveStatus(status: string): void {
			const validStatus = validateStatusName(status);
			if (!mutableInactive.includes(validStatus)) {
				mutableInactive.push(validStatus);
			}
		},

		removeStatus(status: string): void {
			const activeIndex = mutableActive.indexOf(status);
			const inactiveIndex = mutableInactive.indexOf(status);

			if (activeIndex !== -1) {
				if (mutableActive.length === 1) {
					throw new Error("Cannot remove the last active status");
				}
				mutableActive.splice(activeIndex, 1);
			} else if (inactiveIndex !== -1) {
				if (mutableInactive.length === 1) {
					throw new Error("Cannot remove the last inactive status");
				}
				mutableInactive.splice(inactiveIndex, 1);
			}
		},

		toJSON() {
			return {
				active: [...mutableActive],
				inactive: [...mutableInactive],
			};
		},
	};
}

export function pipelineConfigFromData(data: {
	active: string[];
	inactive: string[];
}): PipelineConfig {
	if (data.active.length === 0) {
		throw new Error("Active statuses cannot be empty");
	}

	if (data.inactive.length === 0) {
		throw new Error("Inactive statuses cannot be empty");
	}

	let mutableActive = [...data.active];
	let mutableInactive = [...data.inactive];

	return {
		get active() {
			return [...mutableActive];
		},
		set active(value: string[]) {
			mutableActive = [...value];
		},
		get inactive() {
			return [...mutableInactive];
		},
		set inactive(value: string[]) {
			mutableInactive = [...value];
		},

		addActiveStatus(status: string): void {
			const validStatus = validateStatusName(status);
			if (!mutableActive.includes(validStatus)) {
				mutableActive.push(validStatus);
			}
		},

		addInactiveStatus(status: string): void {
			const validStatus = validateStatusName(status);
			if (!mutableInactive.includes(validStatus)) {
				mutableInactive.push(validStatus);
			}
		},

		removeStatus(status: string): void {
			const activeIndex = mutableActive.indexOf(status);
			const inactiveIndex = mutableInactive.indexOf(status);

			if (activeIndex !== -1) {
				if (mutableActive.length === 1) {
					throw new Error("Cannot remove the last active status");
				}
				mutableActive.splice(activeIndex, 1);
			} else if (inactiveIndex !== -1) {
				if (mutableInactive.length === 1) {
					throw new Error("Cannot remove the last inactive status");
				}
				mutableInactive.splice(inactiveIndex, 1);
			}
		},

		toJSON() {
			return {
				active: [...mutableActive],
				inactive: [...mutableInactive],
			};
		},
	};
}
