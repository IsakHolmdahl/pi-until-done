import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import {
	HARD_BUDGET_CEILING,
	LARGE_BUDGET_CONFIRM_THRESHOLD,
} from "../constants";
import { initialState } from "../initial-state";
import {
	beginFollowUp,
	hasUnresolvedBugs,
	isManualTest,
} from "../manual-test-flow";
import { persist, type Store } from "../store";
import { DIALOGS, NOTIFY, REFUSAL } from "../strings";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";

export const cmdPause = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
): Promise<void> => {
	const s = store.state.status;
	if (s !== "active" && s !== "blocked") {
		ctx.ui.notify(NOTIFY.nothingToPause(s), "warning");
		return;
	}
	persist(pi, store, "pause", {
		status: "paused",
		pausedReason: "user-paused",
	});
	ctx.ui.notify(NOTIFY.paused, "info");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
};

export const cmdResume = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
): Promise<void> => {
	const s = store.state;
	if (s.status === "cleared" || !s.goal) {
		ctx.ui.notify(NOTIFY.nothingToResume, "warning");
		return;
	}
	const challengingDone = s.status === "done";
	if (challengingDone && ctx.hasUI) {
		const ok = await ctx.ui.confirm(
			DIALOGS.resumeDoneTitle,
			DIALOGS.resumeDoneMessage(s.goal),
		);
		if (!ok) return;
	}
	persist(
		pi,
		store,
		"resume",
		{
			status: "active",
			turnsUsed: 0,
			cleanEndPrompts: 0,
			pausedReason: undefined,
		},
		challengingDone ? "resumed after disputed completion" : undefined,
	);
	ctx.ui.notify(NOTIFY.resumed(s.goal), "info");
	pi.sendUserMessage(
		challengingDone
			? `User has disputed the previous /until-done_complete. Resume work on goal: ${s.goal}. New evidence is required before re-completion.`
			: `Resume work on the standing /until-done goal: ${s.goal}`,
	);
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
};

export const cmdCancel = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
): Promise<void> => {
	if (!store.state.goal) {
		ctx.ui.notify(NOTIFY.noGoalToCancel, "info");
		return;
	}
	const ok = ctx.hasUI
		? await ctx.ui.confirm(
				DIALOGS.cancelTitle,
				DIALOGS.cancelMessage(store.state.goal),
			)
		: true;
	if (!ok) return;
	persist(pi, store, "cancel", initialState(), "user cancelled");
	ctx.ui.notify(NOTIFY.cancelled, "info");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
};

const confirmLargeBudget = async (
	ctx: ExtensionCommandContext,
	n: number,
): Promise<boolean> => {
	if (n <= LARGE_BUDGET_CONFIRM_THRESHOLD || !ctx.hasUI) return true;
	return ctx.ui.confirm(
		DIALOGS.largeBudgetTitle,
		DIALOGS.largeBudgetMessage(n, LARGE_BUDGET_CONFIRM_THRESHOLD),
	);
};

export const cmdBudget = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
	raw: string,
): Promise<void> => {
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 1 || n > HARD_BUDGET_CEILING) {
		ctx.ui.notify(NOTIFY.budgetRange(HARD_BUDGET_CEILING), "error");
		return;
	}
	const okay = await confirmLargeBudget(ctx, n);
	if (!okay) return;
	persist(pi, store, "budget", { maxTurns: n }, `budget set to ${n}`);
	ctx.ui.notify(NOTIFY.budgetSet(n), "info");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
};

export const cmdImprovement = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
	pitch: string,
): Promise<void> => {
	if (!isManualTest(store.state)) {
		ctx.ui.notify(REFUSAL.manualTestOnly(store.state.status), "warning");
		return;
	}
	if (hasUnresolvedBugs(store.state)) {
		ctx.ui.notify(REFUSAL.unresolvedBugs, "warning");
		return;
	}
	beginFollowUp(pi, store, ctx, `Improvement: ${pitch}`);
};

export const cmdAutopilot = async (
	_pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
): Promise<void> => {
	store.autopilotEnabled = !store.autopilotEnabled;
	ctx.ui.notify(
		store.autopilotEnabled ? NOTIFY.autopilotEnabled : NOTIFY.autopilotDisabled,
		"warning",
	);
};

export const cmdUnblock = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
): Promise<void> => {
	if (store.state.status !== "blocked") {
		ctx.ui.notify(NOTIFY.nothingToUnblock(store.state.status), "warning");
		return;
	}
	persist(
		pi,
		store,
		"unblock",
		{
			status: "active",
			lastVerdict: "continue",
			lastReason: "user unblocked via /until-done unblock",
		},
		"user unblocked",
	);
	ctx.ui.notify(NOTIFY.unblocked, "info");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
};
