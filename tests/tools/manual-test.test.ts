/** Tests for post-completion manual testing, bug triage, and improvement intake. */

import { afterEach, describe, expect, test } from "bun:test";
import { fauxAssistantMessage, fauxToolCall } from "@mariozechner/pi-ai";
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

const seedManualTest = (runtime: TestRuntime): void => {
	runtime.store.state = {
		...runtime.store.state,
		status: "done",
		phase: "manual_test",
		id: "ud-test",
		goal: "ship X",
		northStar: makeNorthStar(),
		distilled: "# Prior journey\nUseful finding",
		tasks: [
			{
				id: "T-001",
				title: "finish X",
				phase: "green",
				status: "done",
				dependencies: [],
				blocks: [],
				prerequisites: [],
				validationSteps: [],
				ciCommands: [],
				styleguideRules: [],
				guardrails: [],
				learnings: ["keep the adapter small"],
				gotchas: ["fixture needs cleanup"],
				context: [],
			},
		],
	};
};

const drive = async (
	runtime: TestRuntime,
	name: string,
	args: Record<string, unknown>,
): Promise<void> => {
	runtime.setLLM([
		fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" }),
		fauxAssistantMessage("ack", { stopReason: "stop" }),
	]);
	await runtime.prompt("do it");
	await runtime.awaitIdle();
};

describe("manual test lifecycle", () => {
	test("completion enters manual_test and writes a distilled journey", async () => {
		rt = await createTestRuntime({ withUi: true });
		rt.store.state = {
			...rt.store.state,
			status: "active",
			id: "ud-test",
			goal: "ship X",
			northStar: makeNorthStar(),
			reviewerApproved: true,
		};
		rt.setLLM([
			fauxAssistantMessage(
				[
					fauxToolCall("until_done_complete", {
						evidence: "bun test: 10 pass, 0 fail",
					}),
				],
				{ stopReason: "toolUse" },
			),
			fauxAssistantMessage(
				JSON.stringify({ verdict: "done", reason: "criteria met" }),
				{ stopReason: "stop" },
			),
			fauxAssistantMessage("ack", { stopReason: "stop" }),
		]);
		await rt.prompt("complete");
		expect(rt.store.state.status).toBe("done");
		expect(rt.store.state.phase).toBe("manual_test");
		expect(rt.store.state.distilled).toContain("ship X");
	});

	test("minor bug is recorded as fixing without replacing the goal", async () => {
		rt = await createTestRuntime();
		seedManualTest(rt);
		await drive(rt, "until_done_report_bug", {
			description: "button stays disabled after retry",
			severity: "minor",
		});
		expect(rt.store.state.goal).toBe("ship X");
		expect(rt.store.state.bugs[0]).toMatchObject({
			description: "button stays disabled after retry",
			severity: "minor",
			status: "fixing",
		});
	});

	test("minor bug can be resolved with evidence", async () => {
		rt = await createTestRuntime();
		seedManualTest(rt);
		await drive(rt, "until_done_report_bug", {
			description: "button is misaligned",
			severity: "minor",
		});
		await drive(rt, "until_done_resolve_bug", {
			bugId: "B-001",
			evidence: "subagent fixed CSS and bun test passes",
		});
		expect(rt.store.state.bugs[0].status).toBe("resolved");
		expect(rt.store.state.bugs[0].evidence).toContain("bun test");
	});

	test("major bug starts a fresh setup with distilled context", async () => {
		rt = await createTestRuntime();
		seedManualTest(rt);
		await drive(rt, "until_done_report_bug", {
			description: "data is lost on refresh",
			severity: "major",
		});
		expect(rt.store.state.status).toBe("setup");
		expect(rt.store.state.goal).toBe("Fix bug: data is lost on refresh");
		const branch = JSON.stringify(rt.session.sessionManager.getBranch());
		expect(branch).toContain("Prior journey");
		expect(branch).toContain("keep the adapter small");
	});

	test("bug report without severity is rejected instead of inferred", async () => {
		rt = await createTestRuntime();
		seedManualTest(rt);
		await drive(rt, "until_done_report_bug", {
			description: "severity was omitted",
		});
		expect(rt.store.state.bugs).toHaveLength(0);
	});

	test("slash bug command also requires explicit severity", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedManualTest(rt);
		await rt.prompt("/until-done bug the modal crashes");
		expect(rt.store.state.bugs).toHaveLength(0);
		expect(rt.ui.notifies.at(-1)?.message).toContain("major or minor");
	});

	test("improvement pitch starts a fresh setup only after manual testing is clear", async () => {
		rt = await createTestRuntime();
		seedManualTest(rt);
		rt.setLLM([fauxAssistantMessage("ack", { stopReason: "stop" })]);
		await rt.prompt("/until-done improvement export as CSV");
		expect(rt.store.state.status).toBe("setup");
		expect(rt.store.state.goal).toContain("export as CSV");
	});

	test("improvement pitch is refused while a bug remains unresolved", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedManualTest(rt);
		rt.store.state.bugs = [
			{
				id: "B-001",
				description: "open issue",
				severity: "minor",
				status: "open",
				reportedAt: Date.now(),
			},
		];
		await rt.prompt("/until-done improvement export as CSV");
		expect(rt.store.state.status).toBe("done");
		expect(rt.store.state.goal).toBe("ship X");
	});
});
