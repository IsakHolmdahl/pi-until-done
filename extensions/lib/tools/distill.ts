import * as fs from "node:fs";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Static } from "typebox";
import { piUntilGoalDir } from "../paths";
import { DistillParams } from "../schemas/distill";
import { persist, type Store } from "../store";
import type { GoalState } from "../types";
import { failed, ok } from "./result";

type DistillInput = Static<typeof DistillParams>;

export const writeDistilledFile = (
	cwd: string,
	goalId: string,
	prdMarkdown: string,
): string | undefined => {
	try {
		const dir = piUntilGoalDir(cwd, goalId);
		fs.mkdirSync(dir, { recursive: true });
		const file = `${dir}/distilled.md`;
		fs.writeFileSync(file, prdMarkdown);
		return file;
	} catch {
		return undefined;
	}
};

const automaticMarkdown = (state: GoalState): string => {
	const learnings = state.tasks.flatMap((task) => task.learnings);
	const gotchas = state.tasks.flatMap((task) => task.gotchas);
	return [
		`# Distilled journey: ${state.goal}`,
		"",
		`## Done criteria\n${state.doneCriteria}`,
		"",
		"## Evidence",
		...state.evidence.map((item) => `- ${item}`),
		"",
		"## Learnings",
		...(learnings.length
			? learnings.map((item) => `- ${item}`)
			: ["- None recorded"]),
		"",
		"## Gotchas",
		...(gotchas.length
			? gotchas.map((item) => `- ${item}`)
			: ["- None recorded"]),
	].join("\n");
};

export const autoDistill = (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
): void => {
	const markdown = automaticMarkdown(store.state);
	persist(
		pi,
		store,
		"progress",
		{ distilled: markdown },
		"distilled automatically",
	);
	writeDistilledFile(ctx.cwd, store.state.id, markdown);
};

const executeDistill = async (
	pi: ExtensionAPI,
	store: Store,
	params: DistillInput,
	ctx: ExtensionContext,
) => {
	const s = store.state;
	if (s.status !== "done") {
		return failed(
			`Refused: distill only runs after until_done_complete (status=${s.status}).`,
			"not_done",
		);
	}
	persist(
		pi,
		store,
		"progress",
		{ distilled: params.prdMarkdown },
		"distilled",
	);
	const written = writeDistilledFile(ctx.cwd, s.id, params.prdMarkdown);
	const tail = written ? ` Wrote ${written}.` : "";
	return ok(`✓ Distilled the journey into a PRD.${tail}`, { wrote: written });
};

export const registerDistillTool = (pi: ExtensionAPI, store: Store): void => {
	pi.registerTool({
		name: "until_done_distill",
		label: "Until-done distill",
		description:
			"Enrich the automatically generated post-completion distillation with a PRD-shaped summary: problem, solution shape, learnings, gotchas, useful surfaces, and follow-up tasks. Output is written to .pi/until-done/{goal-name}/distilled.md.",
		parameters: DistillParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeDistill(pi, store, params, ctx);
		},
	});
};
