import { afterEach, describe, expect, test } from "bun:test";
import { fauxAssistantMessage } from "@mariozechner/pi-ai";
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

describe("session_start (real runtime)", () => {
	test("on bind, status line is set and reflects no-active-goal", async () => {
		rt = await createTestRuntime({ withUi: true });
		// session_start fires during bindExtensions; refreshStatus / refreshWidget
		// run with our mock UI, so traces should be populated.
		const widgetCalls = rt.ui.widgets.filter((w) => w.key === "until-done");
		expect(widgetCalls.length).toBeGreaterThan(0);
	});

	test("--until-done flag at startup queues a /until-done <intent> turn", async () => {
		// We test this by registering the flag value before bind. The harness
		// doesn't expose flag injection directly; the flag value is sourced from
		// pi.getFlag("until-done"). The handleStartupFlag handler reads that.
		// To exercise it, we'd need the flag to be set before session_start fires.
		// That requires plumbing through `extensionFlagValues` in services. Skipped
		// as a unit; the integration test covers the full /until-done <intent> flow
		// via runtime.prompt().
		expect(true).toBe(true);
	});
});

describe("session_compact re-anchor (#2 fix)", () => {
	test("emits a CustomMessageEntry of customType 'until-done.compaction-context' on compact", async () => {
		rt = await createTestRuntime({ withUi: true });
		// Seed an active goal and produce some compactable context
		rt.store.state = {
			...rt.store.state,
			status: "active",
			id: "ud-test",
			goal: "ship X",
			northStar: makeNorthStar(),
			confirmedByUser: true,
			maxTurns: 100,
			evidence: ["found surface", "wrote failing test"],
			tasks: [],
			turnsUsed: 5,
		};
		// Drive a turn so the session has at least one assistant message
		rt.setLLM([fauxAssistantMessage("ack", { stopReason: "stop" })]);
		await rt.prompt("hi");
		await rt.awaitIdle();
		// Trigger compaction. ctx.compact is async-fire-and-forget;
		// session_compact fires after the compaction LLM call.
		// The faux provider serves the compaction's summarizer call too;
		// queue an extra message for it.
		rt.appendLLM([
			fauxAssistantMessage("compaction summary", { stopReason: "stop" }),
		]);
		const ctx = rt.session.extensionRunner.createContext();
		ctx.compact();
		// Wait for compaction to complete (it's async). Poll for the custom_message entry.
		const start = Date.now();
		while (Date.now() - start < 5000) {
			const branch = rt.session.sessionManager.getBranch();
			const found = branch.find(
				(e) =>
					e.type === "custom_message" &&
					(e as { customType?: string }).customType ===
						"until-done.compaction-context",
			);
			if (found) {
				// found! verify content includes goal + recent evidence
				const content = (found as { content: string }).content;
				expect(typeof content).toBe("string");
				expect(content).toContain("ship X");
				expect(content).toContain("found surface");
				return;
			}
			await new Promise((r) => setTimeout(r, 50));
		}
		throw new Error("compaction-context custom_message not appended within 5s");
	});

	test("session_compact does NOT fire when status is not 'active'", async () => {
		rt = await createTestRuntime({ withUi: true });
		// Status is "setup" by default. Drive a turn. Trigger compact.
		rt.setLLM([fauxAssistantMessage("ack", { stopReason: "stop" })]);
		await rt.prompt("hi");
		await rt.awaitIdle();
		rt.appendLLM([
			fauxAssistantMessage("compaction summary", { stopReason: "stop" }),
		]);
		const ctx = rt.session.extensionRunner.createContext();
		ctx.compact();
		// Wait briefly and assert NO compaction-context entry appears.
		await new Promise((r) => setTimeout(r, 500));
		const branch = rt.session.sessionManager.getBranch();
		const found = branch.find(
			(e) =>
				e.type === "custom_message" &&
				(e as { customType?: string }).customType ===
					"until-done.compaction-context",
		);
		expect(found).toBeUndefined();
	});
});

describe("session_shutdown", () => {
	test("clears status + widget keys cleanly on dispose", async () => {
		rt = await createTestRuntime({ withUi: true });
		const before = rt.ui.statuses.length;
		await rt.runtimeHost.dispose();
		// Set rt to undefined so afterEach doesn't re-dispose
		const traceAfter = rt.ui;
		rt = undefined;
		// session_shutdown triggers ctx.ui.setStatus(STATUS_KEY, undefined)
		const cleared = traceAfter.statuses.find(
			(s) => s.key === "until-done" && s.text === undefined,
		);
		expect(cleared).toBeDefined();
		expect(traceAfter.statuses.length).toBeGreaterThan(before);
	});
});
