import { describe, expect, test } from "bun:test";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { initialState } from "../../extensions/lib/initial-state";
import type { Store } from "../../extensions/lib/store";
import { refreshWidget } from "../../extensions/lib/ui/widget";

interface MockWidgetCall {
	key: string;
	lines: string[] | undefined;
}

const buildMockCtx = (
	calls: MockWidgetCall[],
	hasUi = true,
): ExtensionContext =>
	({
		hasUI: hasUi,
		ui: {
			setWidget: (key: string, lines: string[] | undefined) => {
				calls.push({ key, lines: lines ? [...lines] : undefined });
			},
		},
	}) as unknown as ExtensionContext;

const buildStore = (overrides: Partial<Store> = {}): Store =>
	({
		state: initialState(),
		stats: {
			providerRequests: 0,
			providerResponses: 0,
			userBashRuns: 0,
			modelSwitches: 0,
			thinkingSwitches: 0,
			messageUpdates: 0,
			toolStarts: 0,
			toolEnds: 0,
		},
		lastAssistantText: "",
		progressSignalsThisTurn: 0,
		codeEditsThisTurn: 0,
		userMessagedThisTurn: false,
		turnStartedActive: false,
		autopilotEnabled: false,
		judgeDefault: undefined,
		lastTickAt: 0,
		widgetExpanded: false,
		...overrides,
	}) as Store;

describe("refreshWidget", () => {
	test("clears widget when no goal is active", () => {
		const calls: MockWidgetCall[] = [];
		const store = buildStore();
		refreshWidget(store, buildMockCtx(calls));
		expect(calls).toEqual([{ key: "until-done", lines: undefined }]);
	});

	test("collapses to three rows by default", () => {
		const calls: MockWidgetCall[] = [];
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: "ship the refactor",
				doneCriteria: "tests pass",
				verifyCommand: "bun test",
				askBefore: ["rm -rf"],
				maxTurns: 100,
				turnsUsed: 7,
			},
		});
		refreshWidget(store, buildMockCtx(calls), true);
		expect(calls).toHaveLength(1);
		expect(calls[0].lines).toHaveLength(3);
		expect(calls[0].lines?.[0]).toContain("/until-done");
		expect(calls[0].lines?.[1]).toContain("ship the refactor");
		expect(calls[0].lines?.[2]).toContain("budget");
	});

	test("uses widgetTitle when provided instead of the full goal", () => {
		const calls: MockWidgetCall[] = [];
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: "a very long chat message describing the desired outcome in exhaustive detail",
				widgetTitle: "ship the refactor",
				maxTurns: 100,
				turnsUsed: 3,
			},
		});
		refreshWidget(store, buildMockCtx(calls), true);
		expect(calls[0].lines?.[1]).toContain("ship the refactor");
		expect(calls[0].lines?.[1]).not.toContain("a very long chat message");
	});

	test("expands to show all rows when widgetExpanded is true", () => {
		const calls: MockWidgetCall[] = [];
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: "ship the refactor",
				doneCriteria: "tests pass",
				verifyCommand: "bun test",
				askBefore: ["rm -rf"],
				maxTurns: 100,
				turnsUsed: 7,
			},
			widgetExpanded: true,
		});
		refreshWidget(store, buildMockCtx(calls), true);
		expect(calls[0].lines?.length).toBeGreaterThan(3);
	});

	test("expanded view shows the full untruncated goal, not the widget title", () => {
		const calls: MockWidgetCall[] = [];
		const longGoal =
			"This is a very long goal description that should be shown in full when the widget is expanded.";
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: longGoal,
				widgetTitle: "ship the refactor",
				maxTurns: 100,
				turnsUsed: 3,
			},
			widgetExpanded: true,
		});
		refreshWidget(store, buildMockCtx(calls), true);
		const goalLine = calls[0].lines?.[1] ?? "";
		expect(goalLine).toContain(longGoal);
	});

	test("does not render when status is active and force is false", () => {
		const calls: MockWidgetCall[] = [];
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: "ship the refactor",
				maxTurns: 100,
				turnsUsed: 1,
			},
		});
		refreshWidget(store, buildMockCtx(calls), false);
		expect(calls).toHaveLength(0);
	});

	test("auto-derives widget title from goal when widgetTitle is not set", () => {
		const calls: MockWidgetCall[] = [];
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: "This is a very long goal description that should be truncated for the widget display.",
				maxTurns: 100,
				turnsUsed: 3,
			},
		});
		refreshWidget(store, buildMockCtx(calls), true);
		// Should auto-derive a title (truncated to 50 chars)
		expect(calls[0].lines?.[1]).toContain(
			"This is a very long goal description",
		);
		// The full long goal should NOT be present
		expect(calls[0].lines?.[1]).not.toContain("should be truncated");
	});

	test("auto-derives title from first sentence when goal has punctuation", () => {
		const calls: MockWidgetCall[] = [];
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: "Fix the authentication bug. This involves updating the OAuth flow and adding tests.",
				maxTurns: 100,
				turnsUsed: 3,
			},
		});
		refreshWidget(store, buildMockCtx(calls), true);
		// Should extract first sentence
		expect(calls[0].lines?.[1]).toContain("Fix the authentication bug.");
		expect(calls[0].lines?.[1]).not.toContain("OAuth flow");
	});

	test("truncates auto-derived title with ellipsis when too long", () => {
		const calls: MockWidgetCall[] = [];
		const longGoal = "A".repeat(100); // 100 character goal
		const store = buildStore({
			state: {
				...initialState(),
				status: "active",
				goal: longGoal,
				maxTurns: 100,
				turnsUsed: 3,
			},
		});
		refreshWidget(store, buildMockCtx(calls), true);
		const titleLine = calls[0].lines?.[1] ?? "";
		// Should be truncated to 50 chars + "..." = 53 chars + prefix + hint suffix
		expect(titleLine.length).toBeLessThanOrEqual(53 + 10 + 20); // +10 for "  goal: " prefix, +20 for "  → ctrl+shift+i"
		expect(titleLine).toContain("...");
	});
});
