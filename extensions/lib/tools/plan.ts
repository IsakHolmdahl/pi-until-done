import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Static } from "typebox";

import {
	type PlannotatorDecision,
	requestPlannotatorPlanReview,
} from "../plannotator";
import { PlanParams } from "../schemas/plan";
import { persist, type Store } from "../store";
import {
	DIALOGS,
	NOTIFY,
	REFUSAL,
	TOOL_DESCRIPTIONS,
	TOOL_LABELS,
	TOOL_RESULTS,
} from "../strings";
import type { Task } from "../types";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";
import { writeTasksYaml } from "../yaml-writer";
import { ok, refused } from "./result";

type PlanInput = Static<typeof PlanParams>;

const validateDeps = (tasks: Task[]): string | undefined => {
	const ids = new Set(tasks.map((t) => t.id));
	for (const t of tasks) {
		for (const dep of t.dependencies) {
			if (!ids.has(dep)) return REFUSAL.planUnknownDep(t.id, dep);
		}
	}
	return undefined;
};

const grantPlanApproval = (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
	note: string,
): void => {
	store.state.confirmedByUser = true;
	persist(
		pi,
		store,
		"confirm",
		{ confirmedByUser: true, status: "active" },
		note,
	);
	ctx.ui.notify(NOTIFY.planApproved, "info");
	pi.sendUserMessage("Approved. Begin work on the first task.");
};

const rejectPlan = (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
	note: string,
): void => {
	persist(
		pi,
		store,
		"plan",
		{
			status: "planning",
			tasks: [],
			currentTaskId: undefined,
			planComplete: false,
			confirmedByUser: false,
		},
		note,
	);
	writeTasksYaml(ctx.cwd, store.state);
	ctx.ui.notify(NOTIFY.planRejected, "info");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
};

const tryPlannotatorApproval = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision | undefined> => {
	const decision = await requestPlannotatorPlanReview(
		pi,
		store.state.tasks,
		signal,
	);
	if (!decision) return undefined;
	if (decision.approved) {
		grantPlanApproval(pi, store, ctx, "plannotator approved");
		return { approved: true };
	}
	return { approved: false, feedback: decision.feedback };
};

const awaitPlanApproval = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision> => {
	if (store.autopilotEnabled) {
		grantPlanApproval(pi, store, ctx, "autopilot");
		return { approved: true };
	}
	if (!ctx.hasUI) {
		grantPlanApproval(pi, store, ctx, "no ui; auto-approved");
		return { approved: true };
	}
	const plannotator = await tryPlannotatorApproval(pi, store, ctx, signal);
	if (plannotator) return plannotator;
	const confirmed = await ctx.ui.confirm(
		DIALOGS.approveTitle,
		DIALOGS.approveMessage,
	);
	if (confirmed) {
		grantPlanApproval(pi, store, ctx, "user approved plan");
		return { approved: true };
	}
	return { approved: false };
};

const persistPlan = (
	pi: ExtensionAPI,
	store: Store,
	tasks: Task[],
	first: Task | undefined,
): void => {
	persist(
		pi,
		store,
		"plan",
		{
			tasks,
			currentTaskId: first?.id,
			planComplete: true,
			phase: first?.phase ?? store.state.phase,
		},
		`plan with ${tasks.length} tasks`,
	);
};

const executePlan = async (
	pi: ExtensionAPI,
	store: Store,
	params: PlanInput,
	signal: AbortSignal | undefined,
	ctx: ExtensionContext,
) => {
	const s = store.state;
	if (s.status !== "active" && s.status !== "planning") {
		return refused(REFUSAL.planWrongStatus(s.status), "wrong_status");
	}
	const err = validateDeps(params.tasks);
	if (err) return refused(err, "unknown_dep");
	const first = params.tasks.find((t) => t.dependencies.length === 0);
	if (s.status === "planning") {
		store.state = {
			...store.state,
			tasks: params.tasks,
			currentTaskId: first?.id,
		};
		writeTasksYaml(ctx.cwd, store.state);
		const decision = await awaitPlanApproval(pi, store, ctx, signal);
		if (!decision.approved) {
			rejectPlan(pi, store, ctx, "plan rejected");
			return refused(
				decision.feedback ?? REFUSAL.planRejected,
				"plan_rejected",
			);
		}
	}
	persistPlan(pi, store, params.tasks, first);
	writeTasksYaml(ctx.cwd, store.state);
	return ok(
		TOOL_RESULTS.planAccepted(params.tasks.length, first?.id ?? "(none)"),
		{ count: params.tasks.length, currentTaskId: first?.id },
	);
};

export const registerPlanTool = (pi: ExtensionAPI, store: Store): void => {
	pi.registerTool({
		name: "until_done_plan",
		label: TOOL_LABELS.plan,
		description: TOOL_DESCRIPTIONS.plan,
		parameters: PlanParams,
		async execute(_id, params, signal, _onUpdate, ctx) {
			return executePlan(pi, store, params, signal, ctx);
		},
	});
};
