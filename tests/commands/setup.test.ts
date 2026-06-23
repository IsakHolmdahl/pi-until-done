import { afterEach, describe, expect, test } from "bun:test";
import { fauxAssistantMessage } from "@mariozechner/pi-ai";
import {
	createTestRuntime,
	type TestRuntime,
} from "../helpers/runtime-harness";

let rt: TestRuntime | undefined;

afterEach(async () => {
	await rt?.dispose();
	rt = undefined;
});

describe("/until-done <intent> setup flow", () => {
	test("setup enters planning state; no approval dialog yet", async () => {
		rt = await createTestRuntime({
			withUi: true,
			uiPolicy: { confirm: () => true },
		});
		rt.setLLM([fauxAssistantMessage("ack", { stopReason: "stop" })]);
		await rt.prompt("/until-done implement auth");
		expect(rt.store.state.confirmedByUser).toBe(false);
		expect(rt.store.state.status).toBe("setup");
		expect(rt.store.state.goal).toBe("implement auth");
		// No approval dialog during setup
		expect(rt.ui.confirms.some((c) => c.title.includes("approve"))).toBe(false);
	});

	test("autopilot does not affect setup; confirmation waits for plan", async () => {
		rt = await createTestRuntime({
			withUi: true,
			uiPolicy: { confirm: () => false },
		});
		await rt.prompt("/until-done autopilot");
		expect(rt.store.autopilotEnabled).toBe(true);
		rt.setLLM([fauxAssistantMessage("ack", { stopReason: "stop" })]);
		await rt.prompt("/until-done implement auth");
		expect(rt.store.state.confirmedByUser).toBe(false);
		expect(rt.store.state.status).toBe("setup");
		expect(rt.store.state.goal).toBe("implement auth");
	});

	test("replace-goal flow: prompts user when overriding an active goal", async () => {
		rt = await createTestRuntime({
			withUi: true,
			uiPolicy: {
				select: (_t, options) => {
					// Pick the first option which is "Replace current goal"
					return options[0];
				},
				confirm: () => false, // reject the new contract so the test stops cleanly
			},
		});
		rt.store.state = {
			...rt.store.state,
			status: "active",
			goal: "old goal",
			id: "ud-old",
		};
		rt.setLLM([fauxAssistantMessage("ack", { stopReason: "stop" })]);
		await rt.prompt("/until-done new goal");
		// The replace-goal selector appeared
		expect(
			rt.ui.selects.some((s) => s.title.includes("already has a goal")),
		).toBe(true);
		// The new goal entered setup mode (then was cleared by reject confirm)
		const kinds = rt.getStateEntries().map((e) => e.kind);
		expect(kinds).toContain("cancel"); // old goal cancelled
		expect(kinds).toContain("set"); // new setup begun
	});

	test("replace-goal flow: keep-current-goal preserves the original", async () => {
		rt = await createTestRuntime({
			withUi: true,
			uiPolicy: {
				select: (_t, options) => options[1], // "Keep current goal"
			},
		});
		rt.store.state = {
			...rt.store.state,
			status: "active",
			goal: "keep me",
			id: "ud-keep",
		};
		await rt.prompt("/until-done other goal");
		expect(rt.store.state.goal).toBe("keep me");
		expect(rt.store.state.status).toBe("active");
	});
});
