import { describe, expect, test } from "bun:test";
import { NODE_NPM } from "../../extensions/lib/ci/languages/typescript";

const verbsCovered = NODE_NPM.checks.map((c) => c.verb);

describe("NODE_NPM profile", () => {
	test("detects via package-lock.json", () => {
		expect(NODE_NPM.markers).toEqual(["package-lock.json"]);
	});

	test("covers typecheck/lint/format/test/build", () => {
		expect(verbsCovered).toEqual(
			expect.arrayContaining(["typecheck", "lint", "format", "test", "build"]),
		);
	});

	test("every check is a direct command", () => {
		for (const c of NODE_NPM.checks) {
			expect(c.argv.length).toBeGreaterThan(0);
		}
	});

	test("uses npx --no-install for direct binaries", () => {
		const typecheck = NODE_NPM.checks.find((c) => c.verb === "typecheck");
		expect(typecheck?.argv).toContain("npx");
		expect(typecheck?.argv).toContain("--no-install");
	});

	test("uses npm test for the test verb", () => {
		const t = NODE_NPM.checks.find((c) => c.verb === "test");
		expect(t?.argv).toContain("npm");
		expect(t?.argv).toContain("test");
	});

	test("uses npm run build for the build verb", () => {
		const b = NODE_NPM.checks.find((c) => c.verb === "build");
		expect(b?.argv).toEqual(["npm", "run", "build", "--silent"]);
	});
});
