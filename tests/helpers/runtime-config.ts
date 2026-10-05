import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { registerFauxProvider } from "@mariozechner/pi-ai";
import {
	type AuthStorage,
	type CreateAgentSessionRuntimeFactory,
	createAgentSessionFromServices,
	createAgentSessionServices,
	type ExtensionAPI,
} from "@mariozechner/pi-coding-agent";

type Faux = ReturnType<typeof registerFauxProvider>;

export const seedDir = (
	cwd: string,
	seeds: Record<string, string> | undefined,
): void => {
	if (!seeds) return;
	for (const [rel, content] of Object.entries(seeds)) {
		const full = join(cwd, rel);
		const dir = full.substring(0, full.lastIndexOf("/"));
		if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
		Bun.write(full, content);
	}
};

export const registerJudgeWithRuntime = (
	pi: ExtensionAPI,
	judgeFaux: Faux,
): void => {
	const m = judgeFaux.getModel();
	pi.registerProvider("faux-judge", {
		api: m.api,
		baseUrl: m.baseUrl ?? "http://faux/",
		apiKey: "faux-judge-key",
		models: [
			{
				id: m.id,
				name: m.name,
				api: m.api,
				reasoning: m.reasoning,
				input: [...m.input],
				cost: { ...m.cost },
				contextWindow: m.contextWindow,
				maxTokens: m.maxTokens,
			},
		],
	});
};

export const buildRuntimeFactory = (
	authStorage: AuthStorage,
	faux: Faux,
	factory: (pi: ExtensionAPI) => void,
	companionExtensions: Array<(pi: ExtensionAPI) => void> = [],
): CreateAgentSessionRuntimeFactory => {
	const runtimeOptions = {
		authStorage,
		model: faux.getModel(),
		resourceLoaderOptions: {
			extensionFactories: [factory, ...companionExtensions],
			noSkills: true,
			noPromptTemplates: true,
			noThemes: true,
			noContextFiles: true,
		},
	};
	return async ({ cwd: rcwd, sessionManager, sessionStartEvent }) => {
		const services = await createAgentSessionServices({
			...runtimeOptions,
			cwd: rcwd,
			agentDir: rcwd,
		});
		return {
			...(await createAgentSessionFromServices({
				services,
				sessionManager,
				sessionStartEvent,
				model: faux.getModel(),
			})),
			services,
			diagnostics: services.diagnostics,
		};
	};
};
