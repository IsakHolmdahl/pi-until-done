import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Static } from "typebox";
import { HARD_BUDGET_CEILING } from "../constants";
import {
	BlockParams,
	CompleteParams,
	ProgressParams,
	SetParams,
	UnblockParams,
} from "../schemas/lifecycle";
import { persist, type Store } from "../store";
import {
	NOTIFY,
	REFUSAL,
	TOOL_DESCRIPTIONS,
	TOOL_LABELS,
	TOOL_PROMPT_SNIPPET,
	TOOL_RESULTS,
} from "../strings";
import type { GoalState, NorthStar } from "../types";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";
import { executeComplete } from "./complete";
import { failed, ok, refused } from "./result";

type SetInput = Static<typeof SetParams>;
type BlockInput = Static<typeof BlockParams>;
type UnblockInput = Static<typeof UnblockParams>;
type ProgressInput = Static<typeof ProgressParams>;

const buildNorthStar = (
	params: SetInput,
	verify: string | undefined,
	resolved: { judgeModel?: NorthStar["judgeModel"]; sameModelJudge?: boolean },
): NorthStar => ({
	goal: params.goal,
	widgetTitle: params.widgetTitle,
	doneCriteria: params.doneCriteria,
	verifyCommand: verify,
	askBefore: params.askBefore ?? [],
	decisionStyle: params.decisionStyle,
	goalType: params.goalType,
	surfaces: params.surfaces ?? [],
	judgeModel: resolved.judgeModel,
	sameModelJudge: resolved.sameModelJudge,
});

const resolveJudge = (
	params: SetInput,
	store: Store,
): { judgeModel?: NorthStar["judgeModel"]; sameModelJudge?: boolean } => {
	if (params.judgeModel) return { judgeModel: params.judgeModel };
	if (params.sameModelJudge) return { sameModelJudge: true };
	const fallback = store.judgeDefault;
	if (!fallback) return {};
	if (fallback.mode === "same") return { sameModelJudge: true };
	return {
		judgeModel: { provider: fallback.provider, modelId: fallback.modelId },
	};
};

const setPatch = (
	params: SetInput,
	currentMaxTurns: number,
	resolvedJudge: ReturnType<typeof resolveJudge>,
): Partial<GoalState> => {
	const verify = params.verifyCommand;
	return {
		goal: params.goal,
		widgetTitle: params.widgetTitle,
		doneCriteria: params.doneCriteria,
		askBefore: params.askBefore ?? [],
		decisionStyle: params.decisionStyle,
		verifyCommand: verify,
		northStar: buildNorthStar(params, verify, resolvedJudge),
		goalType: params.goalType,
		surfaces: params.surfaces ?? [],
		phase: params.startPhase ?? "analysis",
		maxTurns: Math.min(params.maxTurns ?? currentMaxTurns, HARD_BUDGET_CEILING),
		createdAt: Date.now(),
		turnsUsed: 0,
	};
};

const executeSet = async (
	pi: ExtensionAPI,
	store: Store,
	params: SetInput,
	ctx: ExtensionContext,
) => {
	const s = store.state;
	if (s.status !== "setup") {
		return refused(REFUSAL.goalExists(s.status), "goal_exists");
	}
	const judge = resolveJudge(params, store);
	if (!judge.judgeModel && !judge.sameModelJudge) {
		return refused(REFUSAL.judgeUnspecified, "judge_unspecified");
	}
	persist(
		pi,
		store,
		"set",
		{ ...setPatch(params, s.maxTurns, judge), status: "planning" },
		"contract drafted; awaiting plan approval",
	);
	ctx.ui.notify(NOTIFY.planApproved, "info");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
	return ok(TOOL_RESULTS.setActivated, { status: store.state.status });
};

const executeBlock = async (
	pi: ExtensionAPI,
	store: Store,
	params: BlockInput,
	ctx: ExtensionContext,
) => {
	const s = store.state;
	if (s.status !== "active")
		return failed(REFUSAL.noActiveBlock(s.status), "no_active_goal");
	persist(
		pi,
		store,
		"block",
		{
			status: "blocked",
			pausedReason: params.reason,
			lastVerdict: "blocked",
			lastReason: params.question,
		},
		params.question,
	);
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
	return ok(TOOL_RESULTS.blocked(params.question), { status: "blocked" });
};

const executeUnblock = async (
	pi: ExtensionAPI,
	store: Store,
	params: UnblockInput,
	ctx: ExtensionContext,
) => {
	const s = store.state;
	if (s.status !== "blocked")
		return failed(REFUSAL.notBlocked(s.status), "not_blocked");
	persist(
		pi,
		store,
		"unblock",
		{
			status: "active",
			lastVerdict: "continue",
			lastReason: params.reason,
			reviewerApproved: false,
		},
		params.reason ?? "block cleared",
	);
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
	return ok(TOOL_RESULTS.unblocked(params.reason), { status: "active" });
};

const executeProgress = async (
	pi: ExtensionAPI,
	store: Store,
	params: ProgressInput,
	ctx: ExtensionContext,
) => {
	const patch: Partial<GoalState> = {
		evidence: [...store.state.evidence, params.note],
	};
	if (params.phase) patch.phase = params.phase;
	persist(pi, store, "progress", patch, params.note);
	refreshStatus(store, ctx);
	const text = params.phase
		? TOOL_RESULTS.progressInPhase(params.phase, params.note)
		: TOOL_RESULTS.progressNoted(params.note);
	return ok(text, { phase: params.phase ?? store.state.phase });
};

const registerSet = (pi: ExtensionAPI, store: Store) => {
	pi.registerTool({
		name: "until_done_set_contract",
		label: TOOL_LABELS.setContract,
		description: TOOL_DESCRIPTIONS.setContract,
		parameters: SetParams,
		promptSnippet: TOOL_PROMPT_SNIPPET,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeSet(pi, store, params, ctx);
		},
	});
};

const registerComplete = (pi: ExtensionAPI, store: Store) => {
	pi.registerTool({
		name: "until_done_complete",
		label: TOOL_LABELS.complete,
		description: TOOL_DESCRIPTIONS.complete,
		parameters: CompleteParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeComplete(pi, store, params, ctx);
		},
	});
};

const registerBlock = (pi: ExtensionAPI, store: Store) => {
	pi.registerTool({
		name: "until_done_block",
		label: TOOL_LABELS.block,
		description: TOOL_DESCRIPTIONS.block,
		parameters: BlockParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeBlock(pi, store, params, ctx);
		},
	});
};

const registerProgress = (pi: ExtensionAPI, store: Store) => {
	pi.registerTool({
		name: "until_done_progress",
		label: TOOL_LABELS.progress,
		description: TOOL_DESCRIPTIONS.progress,
		parameters: ProgressParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeProgress(pi, store, params, ctx);
		},
	});
};

const registerUnblock = (pi: ExtensionAPI, store: Store) => {
	pi.registerTool({
		name: "until_done_unblock",
		label: TOOL_LABELS.unblock,
		description: TOOL_DESCRIPTIONS.unblock,
		parameters: UnblockParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeUnblock(pi, store, params, ctx);
		},
	});
};

export const registerLifecycleTools = (
	pi: ExtensionAPI,
	store: Store,
): void => {
	registerSet(pi, store);
	registerComplete(pi, store);
	registerBlock(pi, store);
	registerUnblock(pi, store);
	registerProgress(pi, store);
};
