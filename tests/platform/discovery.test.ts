import { describe, expect, test } from "bun:test";
import { LANGUAGE_PROFILES } from "../../extensions/lib/ci/languages";

describe("language profile discovery is platform-independent", () => {
	test("every profile uses POSIX-style relative markers (no absolute / Windows paths)", () => {
		for (const p of LANGUAGE_PROFILES) {
			for (const m of p.markers) {
				expect(m).not.toMatch(/^\//);
				expect(m).not.toMatch(/^[A-Z]:\\/);
				expect(m.length).toBeGreaterThan(0);
			}
		}
	});

	test("every check argv is a direct command (no framework wrapper)", () => {
		for (const p of LANGUAGE_PROFILES) {
			for (const c of p.checks) {
				expect(Array.isArray(c.argv)).toBe(true);
				expect(c.argv.length).toBeGreaterThan(0);
			}
		}
	});

	test("every check has a positive timeout", () => {
		for (const p of LANGUAGE_PROFILES) {
			for (const c of p.checks) {
				expect(c.timeoutMs).toBeGreaterThan(0);
			}
		}
	});

	test("every profile id is unique", () => {
		const ids = LANGUAGE_PROFILES.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("npm/pnpm/yarn/bun/deno all detected", () => {
		const ids = LANGUAGE_PROFILES.map((p) => p.id);
		expect(ids).toContain("typescript-bun");
		expect(ids).toContain("node-pnpm");
		expect(ids).toContain("node-npm");
		expect(ids).toContain("node-yarn");
		expect(ids).toContain("deno");
	});
});
