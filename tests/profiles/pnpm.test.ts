import { describe, expect, test } from "bun:test";
import { NODE_PNPM } from "../../extensions/lib/ci/languages/typescript";

const verbsCovered = NODE_PNPM.checks.map((c) => c.verb);

describe("NODE_PNPM profile", () => {
	test("detects via pnpm-lock.yaml", () => {
		expect(NODE_PNPM.markers).toEqual(["pnpm-lock.yaml"]);
	});

	test("covers typecheck/lint/format/test/build", () => {
		expect(verbsCovered).toEqual(
			expect.arrayContaining(["typecheck", "lint", "format", "test", "build"]),
		);
	});

	test("every check is a direct command", () => {
		for (const c of NODE_PNPM.checks) {
			expect(c.argv.length).toBeGreaterThan(0);
		}
	});

	test("uses pnpm exec for tooling", () => {
		const typecheck = NODE_PNPM.checks.find((c) => c.verb === "typecheck");
		expect(typecheck?.argv).toContain("pnpm");
		expect(typecheck?.argv).toContain("exec");
		expect(typecheck?.argv).toContain("tsc");
	});

	test("uses pnpm test for the test verb", () => {
		const t = NODE_PNPM.checks.find((c) => c.verb === "test");
		expect(t?.argv).toEqual(["pnpm", "test"]);
	});

	test("uses pnpm run build for the build verb", () => {
		const b = NODE_PNPM.checks.find((c) => c.verb === "build");
		expect(b?.argv).toEqual(["pnpm", "run", "build"]);
	});
});
