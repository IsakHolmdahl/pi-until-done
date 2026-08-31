/** Shared guards and transitions for post-completion manual testing. */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { beginSetup } from "./commands/setup";
import { carryForwardContext } from "./goal-context";
import type { Store } from "./store";
import type { GoalState } from "./types";

export const isManualTest = (state: GoalState): boolean =>
	state.status === "done" && state.phase === "manual_test";

export const hasUnresolvedBugs = (state: GoalState): boolean =>
	state.bugs.some((bug) => bug.status !== "resolved");

export const beginFollowUp = (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
	intent: string,
): void => {
	const context = carryForwardContext(store.state);
	beginSetup(pi, store, ctx, intent, context);
};
