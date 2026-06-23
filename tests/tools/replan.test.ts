import { afterEach, describe, expect, test } from "bun:test";
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

describe("until_done_replan", () => {
	test("rejects when no northStar", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.northStar = undefined;
		await driveToolCall(rt, "until_done_replan", {
			reason: "test",
			operations: [],
		});
		expect(rt.store.state.replanLog).toHaveLength(0);
	});

	test("rejects empty reason", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		await driveToolCall(rt, "until_done_replan", {
			reason: "   ",
			operations: [],
		});
		expect(rt.store.state.replanLog).toHaveLength(0);
	});

	test("rejects modifying a done task", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.tasks = [makeTask({ id: "T-001", status: "done" })];
		await driveToolCall(rt, "until_done_replan", {
			reason: "try mutate done",
			operations: [{ op: "remove", taskId: "T-001" }],
		});
		expect(rt.store.state.replanLog).toHaveLength(0);
		expect(rt.store.state.tasks[0].status).toBe("done");
	});

	test("rejects dependency cycle", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.tasks = [
			makeTask({ id: "T-001" }),
			makeTask({ id: "T-002", dependencies: ["T-001"] }),
		];
		await driveToolCall(rt, "until_done_replan", {
			reason: "cycle",
			operations: [{ op: "reorder", taskId: "T-001", dependencies: ["T-002"] }],
		});
		expect(rt.store.state.replanLog).toHaveLength(0);
		expect(rt.store.state.tasks[0].dependencies).toEqual([]);
	});

	test("inserts a task and appends a log entry", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.tasks = [makeTask({ id: "T-001" })];
		await driveToolCall(rt, "until_done_replan", {
			reason: "discovered new req",
			operations: [
				{
					op: "insert",
					task: makeTask({ id: "T-002" }),
					insertAfter: "T-001",
				},
			],
		});
		expect(rt.store.state.tasks.map((t) => t.id)).toEqual(["T-001", "T-002"]);
		expect(rt.store.state.replanLog).toHaveLength(1);
		expect(rt.store.state.replanLog[0].reason).toBe("discovered new req");
		expect(rt.store.state.replanLog[0].opsCount).toBe(1);
	});
});
