import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { initialState } from "../initial-state";
import { persist, type Store } from "../store";
import { DIALOGS, NOTIFY } from "../strings";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";
import { setupPrompt } from "./setup-prompt";

const isReplaceable = (status: string): boolean =>
	status === "active" || status === "paused" || status === "blocked";

const confirmReplace = async (
	store: Store,
	ctx: ExtensionCommandContext,
): Promise<boolean> => {
	const choice = await ctx.ui.select(DIALOGS.replaceGoalTitle, [
		DIALOGS.replaceGoalChoice(store.state.status),
		DIALOGS.keepGoalChoice,
		DIALOGS.cancelChoice,
	]);
	return choice === DIALOGS.replaceGoalChoice(store.state.status);
};

const initSetupState = (
	pi: ExtensionAPI,
	store: Store,
	intent: string,
): void => {
	const id = `ud-${Math.random().toString(36).slice(2, 8)}`;
	store.state = {
		...initialState(),
		id,
		goal: intent,
		status: "setup",
		createdAt: Date.now(),
	};
	persist(
		pi,
		store,
		"set",
		{ id, goal: intent, status: "setup" },
		"setup begin",
	);
};

export const cmdSetup = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
	intent: string,
): Promise<void> => {
	if (isReplaceable(store.state.status)) {
		const replace = await confirmReplace(store, ctx);
		if (!replace) return;
		persist(pi, store, "cancel", initialState(), "replaced by new setup");
	}
	initSetupState(pi, store, intent);
	pi.sendUserMessage(setupPrompt(intent));
	ctx.ui.notify(NOTIFY.setupStarted(intent), "info");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
};
