import { VERIFIABILITY_BLOCK } from "../strings";
import { STRUCTURAL_CONSTRAINTS_BLOCK } from "../structural-constraints";

const PHASE_0 = [
	"PHASE 0 — BRAINSTORM (refine the goal before locking it)",
	"0a. The value of good instructions has never been higher. A vague goal will burn turns and produce drift; a sharp goal terminates cleanly.",
	"0b. Before drafting the contract, classify the work:",
	'     • TICKET — solution shape is known up-front ("add X to Y", "fix bug Z"). Decompose into TDD tasks.',
	'     • EXPLORATORY — only the destination is known ("cut p95 by 20%", "feature parity with Mac"). Plan emerges by running.',
	"0c. Interview the user — one or two short questions — to nail down: the verifyCommand (or measurable target), goal type, and which surfaces (logs, metrics, staging URL, flame graphs, cost data, sandbox cluster, etc.) are accessible. A goal is only as effective as the surfaces it can act on.",
	"0d. If the goal is exploratory and the user has not yet pointed you at any surfaces, surface that gap explicitly before proceeding.",
	"0e. USE SUBAGENTS FOR ANALYSIS: Launch `scout` subagents to map the codebase and understand existing patterns. Launch `researcher` subagents to gather external documentation or best practices. Run these in parallel for efficiency.",
];

const PHASE_1 = [
	"PHASE 1 — CONTRACT (you draft, user approves)",
	"1. Apply pi-config TDD discipline: ANALYSIS → BOOTSTRAP → RED → GREEN → REFACTOR → CLEANUP.",
	"2. Draft the contract:",
	"   • outcome — one-line restatement",
	"   • widgetTitle — RECOMMENDED. Short human-readable label (≤50 chars) for the compact status widget. If omitted, the extension auto-derives one from the goal. Set this to a concise summary that fits in a status widget.",
	"   • done-criteria — externally verifiable; must include 'all tests in <verifyCommand> pass' for production-code goals",
	"   • verifyCommand — the single shell command that proves done (e.g. 'bun test'); omit for research/doc",
	"   • ask-before — operations requiring user approval (be specific)",
	"   • decisionStyle — one short sentence on trade-offs",
	"   • goalType — ticket | exploratory (see PHASE 0)",
	"   • surfaces[] — list of {kind, location, notes?} for every data source / staging access / dashboard / sandbox the user has provided",
	"   • startPhase — analysis | bootstrap | red | green | refactor | cleanup | none",
	"   • Judge mode — REQUIRED. Every until_done_complete is gated by an LLM judge. Pick exactly one (until_done_set will refuse with judge_unspecified if both are missing AND the user has not pre-configured /until-done judge):",
	"       - judgeModel: { provider, modelId } — RECOMMENDED. A model DIFFERENT from the executor. Cross-model is the standard fix for Ralph-loop oscillation. If the user has not specified one in their intent, ASK in the contract dialog: 'Which model should judge completion? Pick one different from the executor for strongest convergence (e.g. anthropic/claude-opus-4-7 if the executor is claude-sonnet-4-6).'",
	"       - sameModelJudge: true — fallback when no second model is available. The executor self-judges with a fresh, completion-focused context. Strictly weaker than cross-model.",
	"     The user can also pre-configure a session default with /until-done judge <provider>/<modelId> (or /until-done judge same). If they have, the extension fills it in when you omit both fields — surface that to the user in the contract dialog so they can confirm.",
];

const PHASE_2 = [
	"PHASE 2 — PLAN DOCUMENT (you draft as markdown, plannotator reviews)",
	"3. Write a plan document explaining the approach, architecture decisions, and implementation strategy. This is a thinking document, NOT the task list.",
	"   - Save it by calling `until_done_plan_document` with the markdown content.",
	"   - Plannotator will review the plan document first.",
	"   - If approved, you can then generate the task list.",
	"   - If rejected, revise the plan document and resubmit.",
	"4. After plan document is approved, decompose the goal into a TDD-first task list.",
	"   - Each task must have:",
	"     id (T-001, T-002, ...), title, phase, status: pending,",
	"     dependencies, blocks, prerequisites (each {description, cleared}),",
	"     validationSteps (ordered), ciCommands, styleguideRules,",
	"     guardrails, learnings: [], gotchas, context: [{path|url, why}].",
	"   - Call `until_done_plan` with the full tasks array.",
	"   - Plannotator will review the tasks YAML.",
	"   - If approved, the goal becomes active.",
	"   - If rejected, revise the tasks and resubmit.",
	"5. Show the approved plan document AND the approved task list back to the user as plain markdown.",
	"6. The system will store both in .pi/until-done/{goal-name}/ for reference.",
];

const PHASE_3 = [
	"PHASE 3 — ACTIVATION",
	"6. Call `until_done_set` with the contract fields (including goalType, surfaces, AND the judge-mode field — judgeModel or sameModelJudge — chosen in PHASE 1). This moves the goal to 'planning'.",
	"7. Call `until_done_plan` with the full tasks array. This triggers the user approval dialog (or auto-approves if autopilot is on).",
	"8. After the user approves, begin work on the first task with no dependencies.",
];

const PHASE_4 = [
	"PHASE 4 — EXECUTION",
	"9. For each task:",
	"   - USE WORKER SUBAGENT FOR IMPLEMENTATION: Launch a `worker` subagent to implement each task. The worker is the single writer for the active worktree. Give it the task details, context, validation steps, and success criteria.",
	"   - The worker should call `until_done_task_update` with status='in_progress' before starting.",
	"   - The worker should apply phase discipline: RED before GREEN, GREEN before REFACTOR, REFACTOR before CLEANUP.",
	"   - The worker should append learnings (`addLearning`) and gotchas (`addGotcha`) as it discovers them.",
	"   - The worker should add files/URLs via `addContext`.",
	"   - The worker should run validationSteps and ciCommands.",
	"   - When done, the worker should call `until_done_task_update` with status='done'.",
	"10. BEFORE CALLING THE JUDGE, REVIEWERS MUST APPROVE: Launch `reviewer` subagents to review the implementation for code quality, security flaws, and best practices. Reviewers should NOT check requirements (that's the judge's job). Reviewers must call `until_done_reviewer_approve` with approved=true before you can call `until_done_complete`. If reviewers reject, address feedback and relaunch reviewers.",
	"11. When ALL tasks are done AND reviewers have approved (reviewerApproved=true) AND verifyCommand passes (with quoted output), call `until_done_complete`. The cross-model judge runs inside that call: it sees only the goal, done-criteria, verifyCommand, and your cited evidence — nothing else from this conversation. Cite evidence the judge can verify literally (paste command output, reference file paths). Don't paraphrase. If the judge returns 'continue', re-read its reason, address the specific gap, then call `until_done_complete` again with stronger evidence — re-running with the same evidence will be rejected again.",
	"12. After complete, call `until_done_distill` to compile the journey into a PRD-shaped summary the user can act on.",
	"13. If you hit an ask-before boundary, the loop is paused until the user approves. IMMEDIATELY upon approval, call `until_done_unblock` to clear the blocked state before resuming work. Until you do this, `until_done_task_update` with status='in_progress' or status='done' will be refused.",
	"14. If blocked for any other reason, call `until_done_block` and wait for the user.",
];

export const setupPrompt = (intent: string): string =>
	[
		`/until-done setup for: ${intent}`,
		"",
		"Read this carefully and follow it strictly.",
		"",
		VERIFIABILITY_BLOCK,
		"",
		STRUCTURAL_CONSTRAINTS_BLOCK,
		"",
		...PHASE_0,
		"",
		...PHASE_1,
		"",
		...PHASE_2,
		"",
		...PHASE_3,
		"",
		...PHASE_4,
		"",
		"DO NOT call `until_done_set` or `until_done_plan` until you have drafted the contract and task plan in PHASES 1 and 2.",
	].join("\n");
