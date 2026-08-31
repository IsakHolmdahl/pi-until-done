import type {
	ExtensionAPI,
	ExtensionContext,
	ToolCallEvent,
	ToolCallEventResult,
} from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

import { isInsidePiUntil } from "../paths";
import type { Store } from "../store";
import { DIALOGS, REFUSAL } from "../strings";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";

const matchesAskBefore = (
	askBefore: string[],
	cmd: string,
): string | undefined => {
	const needle = cmd.toLowerCase();
	return askBefore.find((p) => needle.includes(p.toLowerCase()));
};

const writeGateFilePath = (event: ToolCallEvent): string | undefined => {
	if (isToolCallEventType("edit", event)) return event.input.path;
	if (isToolCallEventType("write", event)) return event.input.path;
	return undefined;
};

const checkPrePlanWriteGate = (
	store: Store,
	event: ToolCallEvent,
	cwd: string,
): ToolCallEventResult | undefined => {
	if (store.state.status !== "planning") return undefined;
	const filePath = writeGateFilePath(event);
	if (!filePath) return undefined;
	if (isInsidePiUntil(cwd, filePath)) return undefined;
	return { block: true, reason: REFUSAL.prePlanWriteBlocked(filePath) };
};

const handleBash = async (
	store: Store,
	event: ToolCallEvent,
	ctx: ExtensionContext,
): Promise<ToolCallEventResult | undefined> => {
	if (!isToolCallEventType("bash", event)) return undefined;
	const hit = matchesAskBefore(
		store.state.askBefore,
		event.input.command ?? "",
	);
	if (hit) {
		if (!ctx.hasUI) return { block: true, reason: REFUSAL.noUiAskBefore(hit) };
		const ok = await ctx.ui.confirm(
			DIALOGS.askBeforeTitle,
			DIALOGS.askBeforeMessage(hit, event.input.command),
		);
		if (!ok) return { block: true, reason: REFUSAL.userDenied(hit) };
	}
	store.progressSignalsThisTurn += 2;
	return undefined;
};

const isStrongEdit = (event: ToolCallEvent): boolean =>
	isToolCallEventType("edit", event) || isToolCallEventType("write", event);

const isSearch = (event: ToolCallEvent): boolean =>
	isToolCallEventType("grep", event) ||
	isToolCallEventType("find", event) ||
	isToolCallEventType("ls", event);

const scoreBuiltin = (store: Store, event: ToolCallEvent): boolean => {
	if (isStrongEdit(event)) {
		store.progressSignalsThisTurn += 3;
		store.codeEditsThisTurn += 1;
		return true;
	}
	if (isToolCallEventType("read", event) || isSearch(event)) {
		store.progressSignalsThisTurn += 1;
		return true;
	}
	return false;
};

export const registerToolHooks = (pi: ExtensionAPI, store: Store): void => {
	pi.on("tool_call", async (event, ctx) => {
		const gate = checkPrePlanWriteGate(store, event, ctx.cwd);
		if (gate) return gate;
		if (store.state.status !== "active") return undefined;
		if (isToolCallEventType("bash", event))
			return handleBash(store, event, ctx);
		if (scoreBuiltin(store, event)) return undefined;
		if (event.toolName.startsWith("until_done_")) return undefined;
		store.progressSignalsThisTurn += 2;
		return undefined;
	});

	pi.on("tool_result", (_event, ctx) => {
		refreshStatus(store, ctx);
		refreshWidget(store, ctx, true);
	});
	pi.on("tool_execution_start", () => {
		store.stats.toolStarts++;
	});
	pi.on("tool_execution_update", () => undefined);
	pi.on("tool_execution_end", () => {
		store.stats.toolEnds++;
	});
};
