import { describe, expect, it } from "bun:test";
import { Glob } from "bun";

async function loadAllStyles(): Promise<string> {
	const dir = `${process.cwd()}/src/presentation/styles`;
	const glob = new Glob("*.css");
	const files: string[] = [];

	for await (const file of glob.scan({ cwd: dir })) {
		files.push(file);
	}

	const contents = await Promise.all(
		files.map((f) => Bun.file(`${dir}/${f}`).text()),
	);

	return contents.join("\n\n");
}

const css = await loadAllStyles();

describe("styles accessibility and structure invariants", () => {
	it("defines a base .btn class for buttons", () => {
		const hasBtn = /\n?\.btn\s*\{[^}]*\}/s.test(css);
		expect(hasBtn).toBe(true);
	});

	it("provides a visually hidden helper .sr-only for screen readers", () => {
		const hasSrOnly = /\n?\.sr-only\s*\{[^}]*\}/s.test(css);
		expect(hasSrOnly).toBe(true);
	});

	it("includes an accessible focus-visible style for standardized form controls (.form-control)", () => {
		// Require the new standardized focus-visible rule on .form-control
		const focusControlPattern =
			/\n?\.form-control\s*:\s*focus-visible\s*\{[^}]*?(?:border-color:\s*var\(--color-accent-primary\)|box-shadow:\s*var\(--shadow-focus(?:-blue)?\))[^}]*\}/s;
		const hasControlFocusVisible = focusControlPattern.test(css);
		expect(hasControlFocusVisible).toBe(true);
	});
});
