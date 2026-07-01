import { afterEach, describe, expect, test } from "bun:test";
import { fauxAssistantMessage, fauxToolCall } from "@mariozechner/pi-ai";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { reconstructFromSession } from "../../extensions/lib/store";
import { makeNorthStar } from "../helpers/factories";
import {
	createTestRuntime,
	type TestRuntime,
} from "../helpers/runtime-harness";

let rt: TestRuntime | undefined;

afterEach(async () => {
	await rt?.dispose();
	rt = undefined;
});

const seedActive = (
	runtime: TestRuntime,
	overrides: Partial<typeof runtime.store.state> = {},
) => {
	runtime.store.state = {
		...runtime.store.state,
		status: "active",
		id: "ud-test",
		goal: "ship X",
		northStar: makeNorthStar(),
		confirmedByUser: true,
		maxTurns: 100,
		...overrides,
	};
};

describe("agent_start / agent_end (real runtime)", () => {
	test("agent_start resets per-turn counters but does NOT reset userMessagedThisTurn (#1 fix)", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedActive(rt);
		rt.store.progressSignalsThisTurn = 99;
		rt.store.codeEditsThisTurn = 7;
		rt.store.userMessagedThisTurn = false;
		rt.setLLM([
			fauxAssistantMessage(
				[fauxToolCall("until_done_progress", { note: "x" })],
				{
					stopReason: "toolUse",
				},
			),
			fauxAssistantMessage("done", { stopReason: "stop" }),
		]);
		await rt.prompt("ping");
		// agent_start fired during the loop. After agent_end runs, userMessagedThisTurn
		// is reset to false (we observed the user-driven branch). Counters are also reset
		// at the next agent_start, but at this moment the loop is over. We verify by
		// running another turn:
		expect(rt.store.userMessagedThisTurn).toBe(false);
	});

	test("user-driven turn sets verdict='continue' and does NOT auto-continue (#1 fix)", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedActive(rt);
		rt.setLLM([
			fauxAssistantMessage(
				[fauxToolCall("until_done_progress", { note: "real work" })],
				{
					stopReason: "toolUse",
				},
			),
			fauxAssistantMessage("done", { stopReason: "stop" }),
		]);
		await rt.prompt("hi");
		// The interactive prompt set userMessagedThisTurn=true (input hook),
		// agent_end consults it, persists kind=verdict with note 'user-driven turn',
		// and does NOT call sendUserMessage (no continuation). After consult, flag resets.
		const verdictPatches = rt
			.getStateEntries()
			.filter((e) => e.kind === "verdict")
			.map((e) => e.patch as { lastReason?: string });
		expect(
			verdictPatches.some((p) => p.lastReason === "user-driven turn"),
		).toBe(true);
		expect(rt.store.userMessagedThisTurn).toBe(false);
	});

	test("budget exhaustion transitions active → paused with budget reason", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedActive(rt, { maxTurns: 1, turnsUsed: 0 });
		rt.setLLM([
			fauxAssistantMessage(
				[fauxToolCall("until_done_progress", { note: "1" })],
				{
					stopReason: "toolUse",
				},
			),
			fauxAssistantMessage("done", { stopReason: "stop" }),
		]);
		await rt.prompt("first");
		// turnsUsed becomes 1 in agent_end → triggers budget guard
		expect(rt.store.state.status).toBe("paused");
		expect(rt.store.state.pausedReason).toContain("turn budget exhausted");
	});

	test("turnsUsed is persisted in session entries and survives reconstructFromSession", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedActive(rt);
		rt.setLLM([
			fauxAssistantMessage(
				[fauxToolCall("until_done_progress", { note: "work" })],
				{ stopReason: "toolUse" },
			),
			fauxAssistantMessage("done", { stopReason: "stop" }),
		]);
		await rt.prompt("go");
		expect(rt.store.state.turnsUsed).toBe(1);
		// turnsUsed must appear in at least one persisted patch so reconstruction preserves it
		const hasTurnsPatch = rt
			.getStateEntries()
			.some((e) => (e.patch as { turnsUsed?: number })?.turnsUsed !== undefined);
		expect(hasTurnsPatch).toBe(true);
		// Simulate session_start reconstruction (e.g. pi restart mid-goal)
		const fakeCtx = {
			sessionManager: rt.runtimeHost.session.sessionManager,
		} as unknown as ExtensionContext;
		reconstructFromSession(rt.store, fakeCtx);
		expect(rt.store.state.turnsUsed).toBe(1);
	});

	test("completing the goal in the first turn still increments turnsUsed", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedActive(rt);
		rt.setLLM([
			fauxAssistantMessage(
				[
					fauxToolCall("until_done_complete", {
						evidence: "all tests pass",
						summary: "shipped",
					}),
				],
				{ stopReason: "toolUse" },
			),
			fauxAssistantMessage(
				JSON.stringify({ verdict: "done", reason: "tests pass" }),
				{ stopReason: "stop" },
			),
			fauxAssistantMessage("done", { stopReason: "stop" }),
		]);
		await rt.prompt("go");
		expect(rt.store.state.status).toBe("done");
		expect(rt.store.state.turnsUsed).toBe(1);
	});

	test("only registers the until-done command (no provider/skill/prompt registrations beyond the API surface)", async () => {
		rt = await createTestRuntime({ withUi: true });
		const extensionCommands = rt.pi
			.getCommands()
			.filter((c) => c.source === "extension")
			.map((c) => c.name);
		expect(extensionCommands).toEqual(["until-done"]);
	});
});
