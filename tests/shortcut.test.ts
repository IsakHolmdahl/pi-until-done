import { describe, expect, test } from "bun:test";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { initialState } from "../extensions/lib/initial-state";
import { registerShortcut } from "../extensions/lib/shortcut";
import type { Store } from "../extensions/lib/store";

interface CapturedShortcut {
	key: string;
	description: string;
	handler: (ctx: { ui: { setWidget: () => void } }) => void;
}

const buildMockPi = (captured: CapturedShortcut[]): ExtensionAPI =>
	({
		registerShortcut: (key, options) => {
			captured.push({
				key,
				description: options.description ?? "",
				handler: options.handler as CapturedShortcut["handler"],
			});
		},
	}) as unknown as ExtensionAPI;

const buildStore = (expanded = false): Store =>
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
		widgetExpanded: expanded,
	}) as Store;

describe("registerShortcut", () => {
	test("registers ctrl+i to toggle widget expansion", () => {
		const captured: CapturedShortcut[] = [];
		const store = buildStore(false);
		registerShortcut(buildMockPi(captured), store);
		const toggle = captured.find((c) => c.key === "ctrl+i");
		expect(toggle).toBeDefined();
		expect(toggle?.description).toContain("expand");
	});

	test("ctrl+i handler flips widgetExpanded and refreshes the widget", () => {
		const captured: CapturedShortcut[] = [];
		const store = buildStore(false);
		store.state = {
			...initialState(),
			status: "active",
			goal: "ship it",
			maxTurns: 10,
			turnsUsed: 1,
		};
		const widgetCalls: Array<{ key: string; lines?: string[] }> = [];
		const ctx = {
			hasUI: true,
			ui: {
				setWidget: (key: string, lines: string[] | undefined) => {
					widgetCalls.push({ key, lines: lines ? [...lines] : undefined });
				},
			},
		};

		registerShortcut(buildMockPi(captured), store);
		const toggle = captured.find((c) => c.key === "ctrl+i")?.handler;
		expect(toggle).toBeDefined();

		toggle?.(ctx as never);
		expect(store.widgetExpanded).toBe(true);
		expect(widgetCalls).toHaveLength(1);

		toggle?.(ctx as never);
		expect(store.widgetExpanded).toBe(false);
		expect(widgetCalls).toHaveLength(2);
	});
});
