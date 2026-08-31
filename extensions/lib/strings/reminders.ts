const TDD_LINES = [
	"",
	"TDD discipline:",
	"  • RED: failing production test first.",
	"  • GREEN: smallest change to pass.",
	"  • REFACTOR: structure/perf without behavior change.",
	"",
];

const PLANNING_LINES = [
	"Plan management:",
	"  • If reality diverges from the plan, call `until_done_replan` with a clear `reason`. Inserts/removes/splits/merges/reorders are allowed; done tasks are immutable.",
	"  • The North Star is LOCKED. If goal/doneCriteria/verifyCommand themselves need to change, run `/until-done cancel` and start fresh — don't smuggle changes through replan.",
];

const TOOL_LINES = [
	"",
	"Tool flow:",
	"  • `until_done_task_update` → mark in_progress / done; append learnings & gotchas.",
	"  • `until_done_replan` → restructure pending tasks with a reason.",
	"  • `until_done_complete` → only after running verifyCommand and quoting passing output.",
	"  • `until_done_block` → ask the user when stuck.",
	"",
];

export const REMINDER_HEADERS = {
	northStarHeader: "\n\n# /until-done — North Star (LOCKED, do not drift)\n",
	tdd: TDD_LINES.join("\n"),
	planning: PLANNING_LINES.join("\n"),
	tools: TOOL_LINES.join("\n"),
};

export const REMINDER_LINES = {
	manualTest:
		"\n\n# /until-done — Manual test phase\nThe implementation is complete and has been distilled. Ask the user to test it. If a bug is reported, ask explicitly whether it is major or minor before calling `until_done_report_bug`. Minor bugs require a subagent fix; major bugs start a fresh until-done goal. When all bugs are resolved, offer `/until-done improvement <pitch>`.\n",
	phaseLine: (phase: string) =>
		`\nPhase: ${phase} (ANALYSIS → BOOTSTRAP → RED → GREEN → REFACTOR → CLEANUP)\n`,
	budgetLine: (used: number, max: number) =>
		`Budget: ${used}/${max} turns used.\n`,
	tasksLine: (done: number, total: number, currentId: string, title: string) =>
		`Tasks: ${done}/${total} done. Current: ${currentId} — ${title}\n`,
};
