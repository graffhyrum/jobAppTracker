#!/usr/bin/env bun

/**
 * Changeset Sync Agent
 *
 * Compares git changes with existing changeset/changelog entries
 * and creates missing changeset files as needed.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface GitChange {
	file: string;
	status: string;
	type: "source" | "config" | "docs" | "test" | "infra";
}

interface ChangesetEntry {
	file: string;
	content: string;
	changeType: "patch" | "minor" | "major";
	description: string;
}

class ChangesetSyncAgent {
	private readonly changesetDir = ".changeset";
	private readonly changelogFile = "CHANGELOG.md";

	async run(): Promise<void> {
		console.log("🔍 Analyzing changes for changeset sync...");

		const changes = this.getGitChanges();
		const existingChangesets = this.getExistingChangesets();
		const changelogEntries = this.getChangelogEntries();

		console.log(`📊 Found ${changes.length} changed files`);
		console.log(`📝 Found ${existingChangesets.length} existing changesets`);

		const undocumentedChanges = this.findUndocumentedChanges(
			changes,
			existingChangesets,
			changelogEntries,
		);

		if (undocumentedChanges.length === 0) {
			console.log("✅ All changes are documented!");
			return;
		}

		console.log(
			`📝 Creating ${undocumentedChanges.length} missing changeset entries...`,
		);

		for (const change of undocumentedChanges) {
			await this.createChangesetEntry(change);
		}

		console.log("🎉 Changeset sync complete!");
	}

	private getGitChanges(): GitChange[] {
		try {
			// Get changes since last release tag or main branch
			const gitOutput = execSync("git diff --name-status HEAD~1 HEAD", {
				encoding: "utf8",
			}).trim();

			if (!gitOutput) return [];

			return gitOutput.split("\n").map((line) => {
				const [status, ...fileParts] = line.split("\t");
				const file = fileParts.join("\t");

				return {
					file,
					status,
					type: this.categorizeFile(file),
				};
			});
		} catch (error) {
			console.warn("Could not get git changes, assuming no changes:", error);
			return [];
		}
	}

	private categorizeFile(file: string): GitChange["type"] {
		if (file.startsWith("src/") || file.startsWith("extension/"))
			return "source";
		if (file.startsWith("tests/") || file.endsWith(".test.ts")) return "test";
		if (file.startsWith("docs/") || file === "README.md") return "docs";
		if (
			["package.json", "tsconfig.json", "bun.lock", "biome.json"].includes(file)
		)
			return "config";
		return "infra";
	}

	private getExistingChangesets(): string[] {
		if (!existsSync(this.changesetDir)) return [];

		try {
			const files = execSync(
				`find ${this.changesetDir} -name "*.md" -not -name "README.md"`,
				{
					encoding: "utf8",
				},
			)
				.trim()
				.split("\n")
				.filter(Boolean);

			return files.map((file) => {
				const content = readFileSync(file, "utf8");
				return content.toLowerCase();
			});
		} catch (error) {
			console.warn("Could not read existing changesets:", error);
			return [];
		}
	}

	private getChangelogEntries(): string[] {
		if (!existsSync(this.changelogFile)) return [];

		try {
			const content = readFileSync(this.changelogFile, "utf8");
			// Get recent entries (last 10 lines for simplicity)
			const recentLines = content.split("\n").slice(-10);
			return recentLines.map((line) => line.toLowerCase());
		} catch (error) {
			console.warn("Could not read changelog:", error);
			return [];
		}
	}

	private findUndocumentedChanges(
		changes: GitChange[],
		changesets: string[],
		changelog: string[],
	): GitChange[] {
		return changes.filter((change) => {
			// Skip if already documented in changeset or changelog
			const documented =
				changesets.some(
					(cs) => cs.includes(change.file) || cs.includes(change.type),
				) ||
				changelog.some(
					(cl) => cl.includes(change.file) || cl.includes(change.type),
				);

			return !documented;
		});
	}

	private async createChangesetEntry(change: GitChange): Promise<void> {
		const changeType = this.determineChangeType(change);
		const description = this.generateDescription(change);
		const timestamp = Date.now();
		const fileName = `${timestamp}-${this.sanitizeFileName(change.file)}.md`;
		const filePath = join(this.changesetDir, fileName);

		// Ensure changeset directory exists
		if (!existsSync(this.changesetDir)) {
			mkdirSync(this.changesetDir, { recursive: true });
		}

		const content = `---
"jobapptracker": ${changeType}
---

${description}
`;

		writeFileSync(filePath, content, "utf8");
		console.log(`  ✅ Created: ${fileName}`);
	}

	private determineChangeType(change: GitChange): "patch" | "minor" | "major" {
		// Major changes
		if (change.file.includes("package.json") && change.status === "M") {
			const packageContent = readFileSync("package.json", "utf8");
			if (packageContent.includes('"version"')) {
				return "major";
			}
		}

		// Minor changes
		if (change.type === "source" && change.status === "A") return "minor";
		if (change.file.includes("README.md")) return "minor";

		// Default to patch
		return "patch";
	}

	private generateDescription(change: GitChange): string {
		const actions = {
			A: "Added",
			M: "Updated",
			D: "Removed",
			R: "Renamed",
		};

		const action = actions[change.status as keyof typeof actions] || "Changed";
		const fileName = change.file.split("/").pop() || change.file;

		return `${action} ${change.type} file: ${fileName}`;
	}

	private sanitizeFileName(file: string): string {
		return file
			.replaceAll(/[^a-zA-Z0-9]/g, "-")
			.replaceAll(/-+/g, "-")
			.slice(-50);
	}
}

// Run the agent
if (import.meta.main) {
	const agent = new ChangesetSyncAgent();
	await agent.run().catch(console.error);
}

export { ChangesetSyncAgent };
