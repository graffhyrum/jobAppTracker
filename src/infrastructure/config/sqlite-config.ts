export const sqliteConfig = {
	// Database file paths
	databases: {
		prod: "data/jobapp.sqlite",
		test: ":memory:", // In-memory for fast tests, or use "data/test.sqlite" for persistence
	} as const,
} as const;

// Helper to get database path based on environment
export function getDatabasePath(
	environment: keyof typeof sqliteConfig.databases = "prod",
): string {
	return sqliteConfig.databases[environment];
}
