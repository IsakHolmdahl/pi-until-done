import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import type { Store } from "../store";
import { COMMAND_DESCRIPTION } from "../strings";
import { cmdAsk } from "./ask";
import {
	cmdAutopilot,
	cmdBudget,
	cmdCancel,
	cmdImprovement,
	cmdPause,
	cmdResume,
	cmdUnblock,
} from "./control";
import {
	cmdBugs,
	cmdDetail,
	cmdHelp,
	cmdNorthStar,
	cmdPlanPath,
	cmdReplanLog,
	cmdStatus,
	cmdTasks,
} from "./info";
import { cmdJudge } from "./judge";
import { cmdBug } from "./manual-test";
import { cmdSetup } from "./setup";

export const subcommands = [
	"status",
	"pause",
	"resume",
	"cancel",
	"unblock",
	"budget",
	"detail",
	"plan",
	"tasks",
	"northstar",
	"replan-log",
	"ask",
	"help",
	"autopilot",
	"judge",
	"improvement",
	"bugs",
	"bug",
] as const;

const ZERO_ARG_SUBCOMMANDS = new Set([
	"status",
	"pause",
	"resume",
	"cancel",
	"unblock",
	"detail",
	"tasks",
	"plan",
	"northstar",
	"replan-log",
	"autopilot",
	"bugs",
]);

const isPositiveInteger = (s: string): boolean => /^\d+$/.test(s);

const looksLikeJudgeArg = (rest: string[]): boolean => {
	if (rest.length === 0) return true;
	const head = rest[0];
	if (head === "same" || head === "clear" || head === "off" || head === "none")
		return true;
	return head.includes("/");
};

const dispatch = async (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionCommandContext,
	head: string,
	rest: string[],
	args: string,
): Promise<void> => {
	if (!args || (head === "help" && rest.length === 0)) return cmdHelp(ctx);
	if (ZERO_ARG_SUBCOMMANDS.has(head) && rest.length === 0) {
		if (head === "status") return cmdStatus(store, ctx);
		if (head === "pause") return cmdPause(pi, store, ctx);
		if (head === "resume") return cmdResume(pi, store, ctx);
		if (head === "cancel") return cmdCancel(pi, store, ctx);
		if (head === "detail") return cmdDetail(store, ctx);
		if (head === "bugs") return cmdBugs(store, ctx);
		if (head === "tasks") return cmdTasks(store, ctx);
		if (head === "plan") return cmdPlanPath(ctx);
		if (head === "northstar") return cmdNorthStar(store, ctx);
		if (head === "replan-log") return cmdReplanLog(store, ctx);
		if (head === "autopilot") return cmdAutopilot(pi, store, ctx);
		if (head === "unblock") return cmdUnblock(pi, store, ctx);
	}
	if (head === "budget" && rest.length === 1 && isPositiveInteger(rest[0])) {
		return cmdBudget(pi, store, ctx, rest[0]);
	}
	if (head === "ask" && rest.length >= 1) {
		return cmdAsk(pi, store, ctx, rest.join(" "));
	}
	if (head === "improvement" && rest.length >= 1) {
		return cmdImprovement(pi, store, ctx, rest.join(" "));
	}
	if (head === "bug") return cmdBug(pi, store, ctx, rest.join(" "));
	if (head === "judge" && looksLikeJudgeArg(rest)) {
		return cmdJudge(pi, store, ctx, rest);
	}
	return cmdSetup(pi, store, ctx, args);
};

const completionFor = (s: string) => ({ value: s, label: s });

const argumentCompletions = (prefix: string) => {
	const lower = prefix.toLowerCase();
	return subcommands.filter((s) => s.startsWith(lower)).map(completionFor);
};

const handlerFor =
	(pi: ExtensionAPI, store: Store) =>
	async (raw: string, ctx: ExtensionCommandContext) => {
		const args = raw.trim();
		const [head = "", ...rest] = args.split(/\s+/);
		await dispatch(pi, store, ctx, head, rest, args);
	};

export const registerCommand = (pi: ExtensionAPI, store: Store): void => {
	pi.registerCommand("until-done", {
		description: COMMAND_DESCRIPTION,
		getArgumentCompletions: argumentCompletions,
		handler: handlerFor(pi, store),
	});
};
