import { describe, expect, test } from "bun:test";
import { NODE_YARN } from "../../extensions/lib/ci/languages/typescript";

const verbsCovered = NODE_YARN.checks.map((c) => c.verb);

describe("NODE_YARN profile", () => {
	test("detects via yarn.lock", () => {
		expect(NODE_YARN.markers).toEqual(["yarn.lock"]);
	});

	test("covers typecheck/lint/format/test/build", () => {
		expect(verbsCovered).toEqual(
			expect.arrayContaining(["typecheck", "lint", "format", "test", "build"]),
		);
	});

	test("every check is a direct command", () => {
		for (const c of NODE_YARN.checks) {
			expect(c.argv).not.toContain("mise");
		}
	});

	test("uses yarn exec --silent for direct binaries", () => {
		const typecheck = NODE_YARN.checks.find((c) => c.verb === "typecheck");
		expect(typecheck?.argv).toContain("yarn");
		expect(typecheck?.argv).toContain("exec");
		expect(typecheck?.argv).toContain("--silent");
	});

	test("uses yarn test for the test verb", () => {
		const t = NODE_YARN.checks.find((c) => c.verb === "test");
		expect(t?.argv).toContain("yarn");
		expect(t?.argv).toContain("test");
	});

	test("uses yarn build for the build verb", () => {
		const b = NODE_YARN.checks.find((c) => c.verb === "build");
		expect(b?.argv).toEqual(["yarn", "build"]);
	});
});
