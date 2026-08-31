/** Tools for reporting and resolving bugs found during manual testing. */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Static } from "typebox";
import {
	beginFollowUp,
	hasUnresolvedBugs,
	isManualTest,
} from "../manual-test-flow";
import {
	ImprovementPitchParams,
	ReportBugParams,
	ResolveBugParams,
} from "../schemas/manual-test";
import { persist, type Store } from "../store";
import {
	REFUSAL,
	TOOL_DESCRIPTIONS,
	TOOL_LABELS,
	TOOL_RESULTS,
} from "../strings";
import type { Bug } from "../types";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";
import { failed, ok, refused } from "./result";

type ReportInput = Static<typeof ReportBugParams>;
type ResolveInput = Static<typeof ResolveBugParams>;
type ImprovementInput = Static<typeof ImprovementPitchParams>;

const bugId = (count: number): string =>
	`B-${String(count + 1).padStart(3, "0")}`;

const reportPatch = (state: Store["state"], input: ReportInput): Bug => ({
	id: bugId(state.bugs.length),
	description: input.description,
	severity: input.severity,
	status: input.severity === "minor" ? "fixing" : "open",
	reportedAt: Date.now(),
});

const validManualTest = (store: Store): boolean => isManualTest(store.state);

export const executeReportBug = async (
	pi: ExtensionAPI,
	store: Store,
	input: ReportInput,
	ctx: ExtensionContext,
) => {
	if (!validManualTest(store))
		return failed(REFUSAL.manualTestOnly(store.state.status), "wrong_status");
	const bug = reportPatch(store.state, input);
	persist(
		pi,
		store,
		"bug_report",
		{ bugs: [...store.state.bugs, bug] },
		bug.description,
	);
	if (bug.severity === "major")
		beginFollowUp(pi, store, ctx, `Fix bug: ${bug.description}`);
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
	return ok(
		bug.severity === "major"
			? TOOL_RESULTS.majorBugStarted(bug.description)
			: TOOL_RESULTS.minorBugReported(bug.id),
		{ bugId: bug.id, severity: bug.severity },
	);
};

const resolvePatch = (store: Store, input: ResolveInput): Bug[] | undefined => {
	const target = store.state.bugs.find((bug) => bug.id === input.bugId);
	if (!target || target.severity !== "minor" || target.status !== "fixing")
		return undefined;
	return store.state.bugs.map((bug) =>
		bug.id === input.bugId
			? {
					...bug,
					status: "resolved",
					resolvedAt: Date.now(),
					evidence: input.evidence,
				}
			: bug,
	);
};

export const executeResolveBug = async (
	pi: ExtensionAPI,
	store: Store,
	input: ResolveInput,
	ctx: ExtensionContext,
) => {
	if (!validManualTest(store))
		return failed(REFUSAL.manualTestOnly(store.state.status), "wrong_status");
	const bugs = resolvePatch(store, input);
	if (!bugs) return refused(REFUSAL.unknownBug(input.bugId), "unknown_bug");
	persist(pi, store, "bug_resolve", { bugs }, input.evidence);
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
	return ok(TOOL_RESULTS.bugResolved(input.bugId), { bugId: input.bugId });
};

export const executeImprovementPitch = async (
	pi: ExtensionAPI,
	store: Store,
	input: ImprovementInput,
	ctx: ExtensionContext,
) => {
	if (!isManualTest(store.state))
		return failed(REFUSAL.manualTestOnly(store.state.status), "wrong_status");
	if (hasUnresolvedBugs(store.state))
		return refused(REFUSAL.unresolvedBugs, "unresolved_bugs");
	beginFollowUp(pi, store, ctx, `Improvement: ${input.pitch}`);
	return ok(TOOL_RESULTS.improvementStarted(input.pitch), {
		status: "setup",
	});
};

const registerReportBug = (pi: ExtensionAPI, store: Store): void => {
	pi.registerTool({
		name: "until_done_report_bug",
		label: TOOL_LABELS.reportBug,
		description: TOOL_DESCRIPTIONS.reportBug,
		parameters: ReportBugParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeReportBug(pi, store, params, ctx);
		},
	});
};

const registerResolveBug = (pi: ExtensionAPI, store: Store): void => {
	pi.registerTool({
		name: "until_done_resolve_bug",
		label: TOOL_LABELS.resolveBug,
		description: TOOL_DESCRIPTIONS.resolveBug,
		parameters: ResolveBugParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeResolveBug(pi, store, params, ctx);
		},
	});
};

const registerImprovement = (pi: ExtensionAPI, store: Store): void => {
	pi.registerTool({
		name: "until_done_improvement",
		label: TOOL_LABELS.improvement,
		description: TOOL_DESCRIPTIONS.improvement,
		parameters: ImprovementPitchParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeImprovementPitch(pi, store, params, ctx);
		},
	});
};

export const registerManualTestTools = (
	pi: ExtensionAPI,
	store: Store,
): void => {
	registerReportBug(pi, store);
	registerResolveBug(pi, store);
	registerImprovement(pi, store);
};
