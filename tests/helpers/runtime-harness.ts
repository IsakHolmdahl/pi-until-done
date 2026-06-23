import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type FauxResponseStep,
	fauxAssistantMessage,
	registerFauxProvider,
} from "@mariozechner/pi-ai";
import {
	AuthStorage,
	type createAgentSessionFromServices,
	createAgentSessionRuntime,
	type ExtensionAPI,
	SessionManager,
} from "@mariozechner/pi-coding-agent";
import type { Store } from "../../extensions/lib/store";
import untilDoneExtension from "../../extensions/until-done";
import {
	buildRuntimeFactory,
	registerJudgeWithRuntime,
	seedDir,
} from "./runtime-config";
import { buildUi, createUiTrace, type UiPolicy, type UiTrace } from "./ui-mock";

export type { UiPolicy, UiTrace } from "./ui-mock";

export interface CreateTestRuntimeOptions {
	withUi?: boolean;
	uiPolicy?: UiPolicy;
	seedFiles?: Record<string, string>;
	withJudge?: boolean;
}

export interface TestRuntime {
	cwd: string;
	store: Store;
	pi: ExtensionAPI;
	ui: UiTrace;
	faux: ReturnType<typeof registerFauxProvider>;
	judgeFaux: ReturnType<typeof registerFauxProvider> | undefined;
	session: Awaited<
		ReturnType<typeof createAgentSessionFromServices>
	>["session"];
	runtimeHost: Awaited<ReturnType<typeof createAgentSessionRuntime>>;
	setLLM: (responses: FauxResponseStep[]) => void;
	appendLLM: (responses: FauxResponseStep[]) => void;
	setJudgeLLM: (responses: FauxResponseStep[]) => void;
	prompt: (text: string) => Promise<void>;
	awaitIdle: () => Promise<void>;
	getTaskTexts: () => string[];
	getStateEntries: () => Array<{
		kind: string;
		patch?: unknown;
		note?: string;
	}>;
	dispose: () => Promise<void>;
}

interface BranchEntry {
	type: string;
	customType?: string;
	data?: { kind: string; patch?: unknown; note?: string };
}

const collectStateEntries = (
	branch: ReadonlyArray<BranchEntry>,
): Array<{ kind: string; patch?: unknown; note?: string }> => {
	const out: Array<{ kind: string; patch?: unknown; note?: string }> = [];
	for (const e of branch) {
		if (e.type !== "custom" || e.customType !== "until-done.state") continue;
		if (e.data)
			out.push({ kind: e.data.kind, patch: e.data.patch, note: e.data.note });
	}
	return out;
};

export const createTestRuntime = async (
	options: CreateTestRuntimeOptions = {},
): Promise<TestRuntime> => {
	const cwd = join(
		tmpdir(),
		`pi-until-done-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	mkdirSync(cwd, { recursive: true });
	seedDir(cwd, options.seedFiles);

	const faux = registerFauxProvider({ provider: "faux-pi-until-done" });
	faux.setResponses([fauxAssistantMessage("ok")]);
	const authStorage = AuthStorage.inMemory();
	authStorage.setRuntimeApiKey(faux.getModel().provider, "faux-key");
	const judgeFaux = options.withJudge
		? registerFauxProvider({ provider: "faux-judge" })
		: undefined;
	if (judgeFaux)
		authStorage.setRuntimeApiKey(
			judgeFaux.getModel().provider,
			"faux-judge-key",
		);

	const trace = createUiTrace();
	let store: Store | undefined;
	let captured: ExtensionAPI | undefined;
	const factory = (pi: ExtensionAPI) => {
		captured = pi;
		untilDoneExtension(pi, { onStore: (s) => (store = s) });
	};

	const runtimeHost = await createAgentSessionRuntime(
		buildRuntimeFactory(authStorage, faux, factory),
		{ cwd, agentDir: cwd, sessionManager: SessionManager.create(cwd) },
	);
	await runtimeHost.session.bindExtensions(
		options.withUi ? { uiContext: buildUi(trace, options.uiPolicy ?? {}) } : {},
	);

	if (!store || !captured)
		throw new Error("untilDoneExtension did not bind store/pi");
	if (judgeFaux) registerJudgeWithRuntime(captured, judgeFaux);

	return {
		cwd,
		store,
		pi: captured,
		ui: trace,
		faux,
		judgeFaux,
		session: runtimeHost.session,
		runtimeHost,
		setLLM: (responses) => faux.setResponses(responses),
		appendLLM: (responses) => faux.appendResponses(responses),
		setJudgeLLM: (responses) => {
			if (!judgeFaux)
				throw new Error("createTestRuntime called without withJudge:true");
			judgeFaux.setResponses(responses);
		},
		prompt: (text) =>
			runtimeHost.session.prompt(text, { source: "interactive" }),
		awaitIdle: async () => {
			while (runtimeHost.session.isStreaming) {
				await new Promise((r) => setTimeout(r, 5));
			}
		},
		getTaskTexts: () => store.state.tasks.map((t) => `${t.id}:${t.status}`),
		getStateEntries: () =>
			collectStateEntries(
				runtimeHost.session.sessionManager.getBranch() as BranchEntry[],
			),
		dispose: async () => {
			await runtimeHost.dispose();
			faux.unregister();
			judgeFaux?.unregister();
			if (existsSync(cwd)) rmSync(cwd, { recursive: true, force: true });
		},
	};
};
