import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Type } from "typebox";
import { makeTask } from "../helpers/factories";
import {
	createTestRuntime,
	type TestRuntime,
} from "../helpers/runtime-harness";
import { driveToolCall, seedActive } from "./_helpers";

let rt: TestRuntime | undefined;

afterEach(async () => {
	await rt?.dispose();
	rt = undefined;
});

describe("until_done_propose_plan", () => {
	test("rejects unknown dependency", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [
				makeTask({ id: "T-001", dependencies: ["T-NOT-REAL"] }),
				makeTask({ id: "T-002" }),
			],
		});
		expect(rt.store.state.tasks).toHaveLength(0);
		expect(rt.store.state.planComplete).toBe(false);
	});

	test("accepts a valid plan; first dep-free task becomes current", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [
				makeTask({ id: "T-001", phase: "red" }),
				makeTask({ id: "T-002", dependencies: ["T-001"] }),
			],
		});
		expect(rt.store.state.tasks).toHaveLength(2);
		expect(rt.store.state.currentTaskId).toBe("T-001");
		expect(rt.store.state.planComplete).toBe(true);
		expect(rt.store.state.phase).toBe("red");
	});

	test("writes real tasks.yaml to cwd/.until-done/", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [makeTask({ id: "T-001" })],
		});
		const yamlPath = join(rt.cwd, ".until-done", "tasks.yaml");
		expect(existsSync(yamlPath)).toBe(true);
		const text = await readFile(yamlPath, "utf8");
		expect(text).toContain("T-001");
	});

	test("rejects when status is paused", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.status = "paused";
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [makeTask()],
		});
		expect(rt.store.state.tasks).toHaveLength(0);
	});

	test("when status is planning, shows approval dialog and activates on approve", async () => {
		rt = await createTestRuntime({
			withUi: true,
			uiPolicy: { confirm: () => true },
		});
		rt.store.state = {
			...rt.store.state,
			status: "planning",
			id: "ud-test",
			goal: "ship X",
			northStar: {
				goal: "ship X",
				doneCriteria: "ok",
				goalType: "ticket",
				askBefore: [],
				decisionStyle: "",
				surfaces: [],
			},
			maxTurns: 100,
			planningPhase: "tasks",
		};
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [makeTask({ id: "T-001" })],
		});
		expect(rt.store.state.status as string).toBe("active");
		expect(rt.store.state.confirmedByUser).toBe(true);
		expect(rt.ui.confirms.some((c) => c.title.includes("approve plan"))).toBe(
			true,
		);
	});

	test("when status is planning, rejection preserves contract and resets to planning", async () => {
		rt = await createTestRuntime({
			withUi: true,
			uiPolicy: { confirm: () => false },
		});
		rt.store.state = {
			...rt.store.state,
			status: "planning",
			id: "ud-test",
			goal: "ship X",
			northStar: {
				goal: "ship X",
				doneCriteria: "ok",
				goalType: "ticket",
				askBefore: [],
				decisionStyle: "",
				surfaces: [],
			},
			maxTurns: 100,
			planningPhase: "tasks",
		};
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [makeTask({ id: "T-001" })],
		});
		expect(rt.store.state.status).toBe("planning");
		expect(rt.store.state.goal).toBe("ship X");
		expect(rt.store.state.tasks).toHaveLength(0);
		expect(rt.store.state.confirmedByUser).toBe(false);
	});

	test("when plannotator is installed and approves, plan activates without dialog", async () => {
		rt = await createTestRuntime({ withUi: true });
		installFakePlannotator(rt, { approved: true });
		rt.store.state = {
			...rt.store.state,
			status: "planning",
			id: "ud-test",
			goal: "ship X",
			northStar: {
				goal: "ship X",
				doneCriteria: "ok",
				goalType: "ticket",
				askBefore: [],
				decisionStyle: "",
				surfaces: [],
			},
			maxTurns: 100,
			planningPhase: "tasks",
		};
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [makeTask({ id: "T-001" })],
		});
		expect(rt.store.state.status).toBe("active");
		expect(rt.store.state.confirmedByUser).toBe(true);
		expect(rt.ui.confirms).toHaveLength(0);
	});

	test("when plannotator is installed and rejects, refusal includes feedback and contract is preserved", async () => {
		rt = await createTestRuntime({ withUi: true });
		installFakePlannotator(rt, {
			approved: false,
			feedback: "split the first task into two",
		});
		rt.store.state = {
			...rt.store.state,
			status: "planning",
			id: "ud-test",
			goal: "ship X",
			northStar: {
				goal: "ship X",
				doneCriteria: "ok",
				goalType: "ticket",
				askBefore: [],
				decisionStyle: "",
				surfaces: [],
			},
			maxTurns: 100,
			planningPhase: "tasks",
		};
		await driveToolCall(rt, "until_done_propose_plan", {
			tasks: [makeTask({ id: "T-001" })],
		});
		expect(rt.store.state.status).toBe("planning");
		expect(rt.store.state.goal).toBe("ship X");
		expect(rt.store.state.confirmedByUser).toBe(false);
		expect(rt.store.state.tasks).toHaveLength(0);
	});
});

const installFakePlannotator = (
	rt: TestRuntime,
	decision: { approved: boolean; feedback?: string },
): void => {
	rt.pi.registerTool({
		name: "plannotator_submit_plan",
		label: "Submit Plan",
		description: "fake plannotator tool",
		parameters: Type.Object({}),
		async execute() {
			return {
				content: [{ type: "text" as const, text: "ok" }],
				details: undefined,
			};
		},
	});

	rt.pi.events.on("plannotator:request", (data) => {
		const request = data as {
			requestId: string;
			action: string;
			payload: { planContent: string };
			respond: (response: unknown) => void;
		};
		if (request.action !== "plan-review") return;
		request.respond({
			status: "handled",
			result: { status: "pending", reviewId: "rev-fake" },
		});
		setTimeout(() => {
			rt.pi.events.emit("plannotator:review-result", {
				reviewId: "rev-fake",
				approved: decision.approved,
				feedback: decision.feedback,
			});
		}, 5);
	});
};
