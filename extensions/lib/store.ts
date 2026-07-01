import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { STATE_CUSTOM_TYPE } from "./constants";
import { initialState, initialStats } from "./initial-state";
import type { GoalState, StateEvent, StateEventKind, Stats } from "./types";

export type JudgeDefault =
	| { mode: "cross"; provider: string; modelId: string }
	| { mode: "same" }
	| undefined;

export interface Store {
	state: GoalState;
	stats: Stats;
	lastAssistantText: string;
	progressSignalsThisTurn: number;
	codeEditsThisTurn: number;
	userMessagedThisTurn: boolean;
	turnStartedActive: boolean;
	autopilotEnabled: boolean;
	judgeDefault: JudgeDefault;
	lastTickAt: number;
}

export const createStore = (): Store => ({
	state: initialState(),
	stats: initialStats(),
	lastAssistantText: "",
	progressSignalsThisTurn: 0,
	codeEditsThisTurn: 0,
	userMessagedThisTurn: false,
	turnStartedActive: false,
	autopilotEnabled: false,
	judgeDefault: undefined,
	lastTickAt: 0,
});

export const persist = (
	pi: ExtensionAPI,
	store: Store,
	kind: StateEventKind,
	patch?: Partial<GoalState>,
	note?: string,
): void => {
	store.state = { ...store.state, ...patch };
	const event: StateEvent = {
		kind,
		goalId: store.state.id,
		at: Date.now(),
		patch,
		note,
	};
	pi.appendEntry<StateEvent>(STATE_CUSTOM_TYPE, event);
};

const isStateEntry = (entry: { type: string; customType?: string }): boolean =>
	entry.type === "custom" && entry.customType === STATE_CUSTOM_TYPE;

const applyEntry = (state: GoalState, data: StateEvent): GoalState => {
	if (data.kind === "cancel") return initialState();
	if (data.patch) return { ...state, ...data.patch };
	return state;
};

export const reconstructFromSession = (
	store: Store,
	ctx: ExtensionContext,
): void => {
	let state = initialState();
	for (const entry of ctx.sessionManager.getBranch()) {
		if (!isStateEntry(entry as { type: string; customType?: string })) continue;
		const data = (entry as { data?: StateEvent }).data;
		if (!data) continue;
		state = applyEntry(state, data);
	}
	store.state = state;
};
