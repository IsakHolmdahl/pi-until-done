import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { WIDGET_KEY } from "../constants";
import type { Store } from "../store";
import { WIDGET } from "../strings";
import type { GoalState } from "../types";
import { phaseGlyph } from "./phase-glyph";

const WIDGET_TITLE_MAX_LEN = 50;

const truncate = (text: string, maxLen: number): string =>
	text.length <= maxLen ? text : `${text.slice(0, maxLen - 3).trimEnd()}...`;

const autoWidgetTitle = (goal: string): string => {
	// Try to extract first sentence (up to first period or question mark)
	const sentenceMatch = goal.match(/^[^.!?]+[.!?]/);
	const candidate = sentenceMatch ? sentenceMatch[0].trim() : goal;
	return truncate(candidate, WIDGET_TITLE_MAX_LEN);
};

const displayGoal = (s: GoalState): string =>
	s.widgetTitle || autoWidgetTitle(s.goal);

const headerLine = (s: GoalState): string =>
	WIDGET.header(s.status, phaseGlyph(s.phase), s.phase);

const budgetLine = (s: GoalState): string =>
	WIDGET.budget(s.turnsUsed, s.maxTurns);

const collapsedLines = (s: GoalState): string[] => [
	headerLine(s),
	`${WIDGET.goal(displayGoal(s))}  → ctrl+shift+i`,
	budgetLine(s),
];

const expandedLines = (s: GoalState): string[] => {
	const verdict = s.lastReason
		? WIDGET.verdict(s.lastVerdict ?? "?", s.lastReason)
		: "";
	return [
		headerLine(s),
		WIDGET.goal(displayGoal(s)),
		s.doneCriteria ? WIDGET.doneWhen(s.doneCriteria) : "",
		s.verifyCommand ? WIDGET.verify(s.verifyCommand) : "",
		s.askBefore.length ? WIDGET.askBefore(s.askBefore) : "",
		budgetLine(s),
		verdict,
	].filter(Boolean);
};

const widgetLines = (s: GoalState, expanded: boolean): string[] =>
	expanded ? expandedLines(s) : collapsedLines(s);

const shouldSkip = (s: GoalState, force: boolean): boolean =>
	!force && s.status === "active";

export const refreshWidget = (
	store: Store,
	ctx: ExtensionContext,
	force = false,
): void => {
	if (!ctx.hasUI) return;
	const s = store.state;
	if (s.status === "cleared" || !s.goal) {
		ctx.ui.setWidget(WIDGET_KEY, undefined);
		return;
	}
	if (shouldSkip(s, force)) return;
	ctx.ui.setWidget(WIDGET_KEY, widgetLines(s, store.widgetExpanded), {
		placement: "aboveEditor",
	});
};
