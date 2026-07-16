import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	discoverChecks,
	invalidateDiscoveryCache,
} from "../../extensions/lib/ci/discover";

const dirs: string[] = [];
const tmp = (prefix = "ud-disc-"): string => {
	const d = mkdtempSync(join(tmpdir(), prefix));
	dirs.push(d);
	return d;
};

afterEach(() => {
	invalidateDiscoveryCache();
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const seed = (cwd: string, files: Record<string, string>): void => {
	for (const [rel, content] of Object.entries(files)) {
		const full = join(cwd, rel);
		const dir = full.substring(0, full.lastIndexOf("/"));
		if (dir && dir !== cwd) mkdirSync(dir, { recursive: true });
		writeFileSync(full, content);
	}
};

const verbsFor = async (cwd: string): Promise<string[]> => {
	const checks = await discoverChecks(cwd);
	return checks.map((c) => c.verb);
};

const argvForVerb = async (cwd: string, verb: string): Promise<string[]> => {
	const checks = await discoverChecks(cwd);
	const c = checks.find((x) => x.verb === verb);
	return c ? [...c.argv] : [];
};

describe("discoverChecks against real fs", () => {
	test("empty dir → no profile checks", async () => {
		const cwd = tmp();
		const checks = await discoverChecks(cwd);
		expect(checks).toEqual([]);
	});

	test("pure-Java Gradle (no kotlin signal) → JAVA_GRADLE wins (#7 fix)", async () => {
		const cwd = tmp();
		seed(cwd, {
			"build.gradle":
				"apply plugin: 'java'\ndependencies { implementation 'foo' }\n",
		});
		const argv = await argvForVerb(cwd, "compile");
		expect(argv).toContain("compileJava");
		expect(argv).not.toContain("compileKotlin");
	});

	test("Kotlin Gradle (kotlin('jvm') in build script) → KOTLIN_GRADLE wins (#7 fix)", async () => {
		const cwd = tmp();
		seed(cwd, {
			"build.gradle.kts": 'plugins {\n  kotlin("jvm") version "2.0.0"\n}\n',
		});
		const argv = await argvForVerb(cwd, "compile");
		expect(argv).toContain("compileKotlin");
		expect(argv).not.toContain("compileJava");
	});

	test("pure-Java Maven (no kotlin-maven-plugin) → JAVA_MAVEN wins (#11 fix)", async () => {
		const cwd = tmp();
		seed(cwd, {
			"pom.xml":
				"<project><groupId>foo</groupId><artifactId>bar</artifactId></project>\n",
		});
		const verbs = await verbsFor(cwd);
		expect(verbs).toContain("lint"); // JAVA_MAVEN provides lint, KOTLIN_MAVEN does
	});

	test("Kotlin Maven (kotlin-maven-plugin in pom) → KOTLIN_MAVEN wins", async () => {
		const cwd = tmp();
		seed(cwd, {
			"pom.xml":
				"<project><dependencies><dependency><groupId>org.jetbrains.kotlin</groupId><artifactId>kotlin-stdlib</artifactId></dependency></dependencies></project>\n",
		});
		const verbs = await verbsFor(cwd);
		expect(verbs).toContain("compile");
		expect(verbs).toContain("test");
	});

	test("uv-managed Python (pyproject.toml + uv.lock) → PYTHON_UV first (#8 fix)", async () => {
		const cwd = tmp();
		seed(cwd, {
			"pyproject.toml": "[project]\nname = 'x'\n",
			"uv.lock": "version = 1\n",
		});
		const argv = await argvForVerb(cwd, "typecheck");
		expect(argv).toEqual(["uv", "run", "mypy", "."]);
	});

	test("pure-Python (pyproject.toml only) → PYTHON profile (no uv prefix)", async () => {
		const cwd = tmp();
		seed(cwd, {
			"pyproject.toml": "[project]\nname = 'x'\n",
		});
		const argv = await argvForVerb(cwd, "typecheck");
		expect(argv).toEqual(["mypy", "--pretty", "."]);
	});

	test("Roblox project (default.project.json) → ROBLOX wins, NOT LUAU (#12 fix)", async () => {
		const cwd = tmp();
		seed(cwd, {
			"default.project.json": '{"name":"game","tree":{}}\n',
		});
		const verbs = await verbsFor(cwd);
		// ROBLOX provides build (rojo build), LUAU does not
		expect(verbs).toContain("build");
		const buildArgv = await argvForVerb(cwd, "build");
		expect(buildArgv).toContain("rojo");
	});

	test("pure-Luau (.luaurc only) → LUAU profile", async () => {
		const cwd = tmp();
		seed(cwd, {
			".luaurc": '{ "languageVersion": "Luau" }\n',
		});
		const verbs = await verbsFor(cwd);
		// LUAU provides typecheck/lint/format (no build)
		expect(verbs).toContain("typecheck");
		expect(verbs).toContain("lint");
		expect(verbs).toContain("format");
		expect(verbs).not.toContain("build");
	});

	test("every check has a positive timeout and is a direct command", async () => {
		const cwd = tmp();
		seed(cwd, { "package-lock.json": "{}\n" });
		const checks = await discoverChecks(cwd);
		for (const c of checks) {
			expect(c.timeoutMs).toBeGreaterThan(0);
			expect(c.argv.length).toBeGreaterThan(0);
		}
	});

	test("discovery result is cached (same cwd reuses checks within TTL)", async () => {
		const cwd = tmp();
		seed(cwd, { "package-lock.json": "{}\n" });
		const a = await discoverChecks(cwd);
		const b = await discoverChecks(cwd);
		expect(a).toBe(b); // same array reference proves cache hit
	});

	test("invalidateDiscoveryCache forces a fresh fs scan", async () => {
		const cwd = tmp();
		seed(cwd, { "package-lock.json": "{}\n" });
		const a = await discoverChecks(cwd);
		invalidateDiscoveryCache();
		const b = await discoverChecks(cwd);
		expect(a).not.toBe(b); // different arrays after invalidation
		expect(a.length).toBe(b.length); // same content though
	});
});
