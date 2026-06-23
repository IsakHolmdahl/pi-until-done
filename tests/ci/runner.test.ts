import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { runOne } from "../../extensions/lib/ci/runner";
import type { CiCheck } from "../../extensions/lib/ci/types";

const check = (
	verb: CiCheck["verb"],
	argv: string[],
	timeoutMs = 10_000,
): CiCheck => ({ verb, argv, timeoutMs });

describe("runOne against real subprocesses", () => {
	test("ok=true for /bin/sh -c 'true'", async () => {
		const r = await runOne(check("typecheck", ["sh", "-c", "true"]), tmpdir());
		expect(r.ok).toBe(true);
		expect(r.exitCode).toBe(0);
		expect(r.skipped).toBe(false);
	});

	test("ok=false, exitCode=1 for /bin/sh -c 'false'", async () => {
		const r = await runOne(check("test", ["sh", "-c", "false"]), tmpdir());
		expect(r.ok).toBe(false);
		expect(r.exitCode).toBe(1);
	});

	test("captures stdout in output", async () => {
		const r = await runOne(
			check("test", ["sh", "-c", "echo hello-from-test"]),
			tmpdir(),
		);
		expect(r.output).toContain("hello-from-test");
		expect(r.ok).toBe(true);
	});

	test("captures stderr in output (interleaved with stdout)", async () => {
		const r = await runOne(
			check("test", ["sh", "-c", "echo err-from-stderr 1>&2; exit 1"]),
			tmpdir(),
		);
		expect(r.output).toContain("err-from-stderr");
		expect(r.ok).toBe(false);
	});

	test("output truncates with marker when stdout > 4000 chars", async () => {
		const r = await runOne(
			check("test", [
				"sh",
				"-c",
				"node -e \"process.stdout.write('x'.repeat(5000))\"",
			]),
			tmpdir(),
		);
		expect(r.output.startsWith("[output truncated;")).toBe(true);
		// Truncated to ~4000 chars + marker prefix; total length should be > 4000 but ≤ 4100
		expect(r.output.length).toBeGreaterThan(4000);
		expect(r.output.length).toBeLessThan(4100);
	});

	test("durationMs is recorded and ≥ 0", async () => {
		const r = await runOne(check("test", ["sh", "-c", "sleep 0.05"]), tmpdir());
		expect(r.durationMs).toBeGreaterThanOrEqual(40);
	});

	test("timeout kills proc and returns ok=false", async () => {
		const r = await runOne(
			check("test", ["sh", "-c", "sleep 5"], 100),
			tmpdir(),
		);
		expect(r.ok).toBe(false);
		// Killed processes typically have exitCode null OR a non-zero termination code.
		expect(r.exitCode === 0).toBe(false);
		// Should complete well before the 5s sleep would finish.
		expect(r.durationMs).toBeLessThan(2000);
	});

	test("AbortSignal aborts in-flight subprocess (#16 fix)", async () => {
		const ac = new AbortController();
		const start = Date.now();
		setTimeout(() => ac.abort(), 50);
		const r = await runOne(
			check("test", ["sh", "-c", "sleep 5"], 60_000),
			tmpdir(),
			ac.signal,
		);
		expect(r.ok).toBe(false);
		expect(Date.now() - start).toBeLessThan(2000);
	});

	test("pre-aborted signal terminates immediately", async () => {
		const ac = new AbortController();
		ac.abort();
		const r = await runOne(
			check("test", ["sh", "-c", "sleep 5"], 60_000),
			tmpdir(),
			ac.signal,
		);
		expect(r.ok).toBe(false);
		expect(r.durationMs).toBeLessThan(1000);
	});
});
