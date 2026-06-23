import { describe, expect, test } from "bun:test";
import { TYPESCRIPT_BUN } from "../../extensions/lib/ci/languages/typescript";

const verbsCovered = TYPESCRIPT_BUN.checks.map((c) => c.verb);

describe("TYPESCRIPT_BUN profile", () => {
	test("detects via bun.lock or bun.lockb", () => {
		expect(TYPESCRIPT_BUN.markers).toContain("bun.lock");
		expect(TYPESCRIPT_BUN.markers).toContain("bun.lockb");
	});

	test("covers typecheck/lint/format/test/build", () => {
		expect(verbsCovered).toEqual(
			expect.arrayContaining(["typecheck", "lint", "format", "test", "build"]),
		);
	});

	test("every check is a direct command", () => {
		for (const c of TYPESCRIPT_BUN.checks) {
			expect(c.argv).not.toContain("mise");
		}
	});

	test("uses bun for tooling (typecheck via bun x tsc)", () => {
		const typecheck = TYPESCRIPT_BUN.checks.find((c) => c.verb === "typecheck");
		expect(typecheck?.argv).toContain("bun");
		expect(typecheck?.argv).toContain("tsc");
	});

	test("uses bun's native test runner", () => {
		const t = TYPESCRIPT_BUN.checks.find((c) => c.verb === "test");
		expect(t?.argv).toEqual(["bun", "test"]);
	});
});
