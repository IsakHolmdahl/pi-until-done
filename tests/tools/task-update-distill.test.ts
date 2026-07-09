import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

describe("until_done_task_update", () => {
	test("rejects unknown task", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		await driveToolCall(rt, "until_done_task_update", {
			id: "T-NOPE",
			patch: { status: "done" },
		});
		expect(rt.store.state.tasks).toHaveLength(0);
	});

	test("rejects marking done while goal is blocked", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.status = "blocked";
		rt.store.state.tasks = [makeTask({ id: "T-001", status: "in_progress" })];
		rt.store.state.currentTaskId = "T-001";
		await driveToolCall(rt, "until_done_task_update", {
			id: "T-001",
			patch: { status: "done" },
		});
		expect(rt.store.state.tasks[0].status).toBe("in_progress");
	});

	test("rejects marking in_progress while goal is blocked", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.status = "blocked";
		rt.store.state.tasks = [makeTask({ id: "T-001", status: "pending" })];
		await driveToolCall(rt, "until_done_task_update", {
			id: "T-001",
			patch: { status: "in_progress" },
		});
		expect(rt.store.state.tasks[0].status).toBe("pending");
	});

	test("allows non-status patches while goal is blocked", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.status = "blocked";
		rt.store.state.tasks = [
			makeTask({ id: "T-001", status: "in_progress", learnings: ["a"] }),
		];
		await driveToolCall(rt, "until_done_task_update", {
			id: "T-001",
			patch: { addLearning: "b" },
		});
		expect(rt.store.state.tasks[0].learnings).toEqual(["a", "b"]);
	});

	test("marking a task done advances cursor to next ready task; phase follows", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.tasks = [
			makeTask({ id: "T-001", status: "in_progress", phase: "green" }),
			makeTask({
				id: "T-002",
				dependencies: ["T-001"],
				status: "pending",
				phase: "refactor",
			}),
		];
		rt.store.state.currentTaskId = "T-001";
		await driveToolCall(rt, "until_done_task_update", {
			id: "T-001",
			patch: { status: "done" },
		});
		expect(rt.store.state.tasks[0].status).toBe("done");
		expect(rt.store.state.currentTaskId).toBe("T-002");
		expect(rt.store.state.phase).toBe("refactor");
	});

	test("setting in_progress on a non-current task moves the cursor", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.tasks = [
			makeTask({ id: "T-001", status: "pending", phase: "analysis" }),
			makeTask({ id: "T-002", status: "pending", phase: "red" }),
		];
		rt.store.state.currentTaskId = "T-001";
		await driveToolCall(rt, "until_done_task_update", {
			id: "T-002",
			patch: { status: "in_progress" },
		});
		expect(rt.store.state.currentTaskId).toBe("T-002");
		expect(rt.store.state.phase).toBe("red");
	});

	test("addLearning appends to the task's learnings", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.tasks = [
			makeTask({ id: "T-001", status: "in_progress", learnings: ["a"] }),
		];
		rt.store.state.currentTaskId = "T-001";
		await driveToolCall(rt, "until_done_task_update", {
			id: "T-001",
			patch: { addLearning: "b" },
		});
		expect(rt.store.state.tasks[0].learnings).toEqual(["a", "b"]);
	});
});

describe("until_done_distill", () => {
	test("rejects when status !== done", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		await driveToolCall(rt, "until_done_distill", {
			prdMarkdown: "# distilled",
		});
		expect(rt.store.state.distilled).toBeUndefined();
	});

	test("writes real .pi/until-done/distilled.md after done", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		rt.store.state.status = "done";
		await driveToolCall(rt, "until_done_distill", {
			prdMarkdown: "# distilled\n\n- learned X\n",
		});
		// Goal is "ship X" → slug = "ship-x"
		const mdPath = join(rt.cwd, ".pi", "until-done", "ship-x", "distilled.md");
		expect(existsSync(mdPath)).toBe(true);
		const text = await readFile(mdPath, "utf8");
		expect(text).toContain("learned X");
		expect(rt.store.state.distilled).toContain("learned X");
	});
});
