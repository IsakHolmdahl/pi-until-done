/**
 * Tests for until_done_draft_plan — plan document submission and plannotator
 * approval gate. Plannotator is the sole external reviewer; when unavailable
 * the tool must auto-approve rather than asking the user via a confirm dialog.
 */
import { afterEach, describe, expect, test } from "bun:test";
import {
	createTestRuntime,
	type TestRuntime,
} from "../helpers/runtime-harness";
import { driveToolCall, seedActive, seedPlanning } from "./_helpers";

let rt: TestRuntime | undefined;

afterEach(async () => {
	await rt?.dispose();
	rt = undefined;
});

const PLAN_DOC = "# Plan\n\nDo the thing.";

const installFakePlannotatorForDocument = (
	rt: TestRuntime,
	decision: { approved: boolean; feedback?: string },
): void => {
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
			result: { status: "pending", reviewId: "rev-doc-fake" },
		});
		setTimeout(() => {
			rt.pi.events.emit("plannotator:review-result", {
				reviewId: "rev-doc-fake",
				approved: decision.approved,
				feedback: decision.feedback,
			});
		}, 5);
	});
};

describe("until_done_draft_plan", () => {
	test("rejects when goal is not in planning status", async () => {
		rt = await createTestRuntime();
		seedActive(rt);
		await driveToolCall(rt, "until_done_draft_plan", {
			planDocument: PLAN_DOC,
		});
		// No plan_document event should have been emitted on wrong status
		const events = rt.getStateEntries();
		expect(events.some((e) => e.kind === "plan_document")).toBe(false);
	});

	test("when no plannotator, auto-approves without a confirm dialog", async () => {
		rt = await createTestRuntime({ withUi: true });
		seedPlanning(rt);
		await driveToolCall(rt, "until_done_draft_plan", {
			planDocument: PLAN_DOC,
		});
		// plannotator is the sole reviewer — no user dialog must appear
		expect(rt.ui.confirms).toHaveLength(0);
		// plan should be approved, advancing to the tasks phase
		expect(rt.store.state.planningPhase).toBe("tasks");
	});

	test("when plannotator approves, advances to tasks phase without dialog", async () => {
		rt = await createTestRuntime({ withUi: true });
		installFakePlannotatorForDocument(rt, { approved: true });
		seedPlanning(rt);
		await driveToolCall(rt, "until_done_draft_plan", {
			planDocument: PLAN_DOC,
		});
		expect(rt.store.state.planningPhase).toBe("tasks");
		expect(rt.ui.confirms).toHaveLength(0);
	});

	test("when plannotator rejects with feedback, stays in document phase and no dialog", async () => {
		rt = await createTestRuntime({ withUi: true });
		installFakePlannotatorForDocument(rt, {
			approved: false,
			feedback: "needs more detail in section 2",
		});
		seedPlanning(rt);
		await driveToolCall(rt, "until_done_draft_plan", {
			planDocument: PLAN_DOC,
		});
		expect(rt.store.state.planningPhase).toBe("document");
		expect(rt.ui.confirms).toHaveLength(0);
	});

	test("when plannotator rejects without feedback, stays in document phase", async () => {
		rt = await createTestRuntime({ withUi: true });
		installFakePlannotatorForDocument(rt, { approved: false });
		seedPlanning(rt);
		await driveToolCall(rt, "until_done_draft_plan", {
			planDocument: PLAN_DOC,
		});
		expect(rt.store.state.planningPhase).toBe("document");
	});

	test("when user takes >3 s to decide in plannotator, their choice is still used", async () => {
		rt = await createTestRuntime({ withUi: true });
		// Plannotator accepts immediately but the user takes 3.2 s to reject.
		// Before the fix, waitForResult timed out at 3 s and the choice was ignored.
		rt.pi.events.on("plannotator:request", (data) => {
			const req = data as {
				action: string;
				respond: (r: unknown) => void;
			};
			if (req.action !== "plan-review") return;
			req.respond({
				status: "handled",
				result: { status: "pending", reviewId: "rev-slow" },
			});
			setTimeout(() => {
				rt?.pi.events.emit("plannotator:review-result", {
					reviewId: "rev-slow",
					approved: false,
					feedback: "too vague",
				});
			}, 3200);
		});
		seedPlanning(rt);
		await driveToolCall(rt, "until_done_draft_plan", {
			planDocument: PLAN_DOC,
		});
		// Choice must be honoured: plannotator said rejected
		expect(rt.store.state.planningPhase).toBe("document");
		expect(rt.ui.confirms).toHaveLength(0);
	});
});
