type FieldTransform = "json" | "boolean";
type NormalizeConfig = Record<string, FieldTransform>;

/**
 * Creates a normalizer function for SQLite rows.
 * Handles null-to-undefined conversion and per-field transforms:
 * - "json": JSON.parse string values
 * - "boolean": convert SQLite integer (0/1) to boolean
 */
export function createRowNormalizer(
	config: NormalizeConfig,
): (record: unknown) => unknown {
	return function normalizeRow(record: unknown): unknown {
		if (typeof record !== "object" || record === null) return record;

		const row = record as Record<string, unknown>;
		const normalized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(row)) {
			if (value === null) continue;

			const transform = config[key];
			if (transform === "json" && typeof value === "string") {
				normalized[key] = JSON.parse(value);
			} else if (transform === "boolean" && typeof value === "number") {
				normalized[key] = value === 1;
			} else {
				normalized[key] = value;
			}
		}

		return normalized;
	};
}

export const normalizeJobAppRow = createRowNormalizer({
	notes: "json",
	statusLog: "json",
	isRemote: "boolean",
});

export const normalizeContactRow = createRowNormalizer({
	responseReceived: "boolean",
});

export const normalizeInterviewStageRow = createRowNormalizer({
	questions: "json",
	isFinalRound: "boolean",
});

export const normalizeJobBoardRow = createRowNormalizer({
	domains: "json",
});
