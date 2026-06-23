export const TOOL_DESCRIPTIONS = {
	plan: "Provide the comprehensive TDD-first task list for the active /until-done goal. Each task must declare dependencies, blocks, prerequisites, ordered validation steps, ci/cd commands, styleguide rules, guardrails, learnings (initially []), gotchas, and context references. Call once after `until_done_set`; this triggers the user approval dialog. The list is written to `.until-done/tasks.yaml` for human review.",
	replan:
		"Modify the task list mid-execution: insert / remove / replace / split / merge / reorder. The North Star (goal, doneCriteria, verifyCommand, askBefore) is LOCKED — call `/until-done cancel` if you need to change those. `done` tasks are immutable. Every call must include a `reason` (one short sentence) which is appended to affected tasks' learnings.",
	taskUpdate:
		"Patch a single task in the live plan. Use to mark status transitions, append learnings, append gotchas, add context references, refine validation steps, or update guardrails. The .until-done/tasks.yaml file is rewritten after each call.",
	set: "Draft the /until-done goal contract. The model fills in goal, doneCriteria, askBefore[], and decisionStyle from the conversation, then calls this tool. The goal moves from 'setup' to 'planning'; approval happens after `until_done_plan`.",
	complete:
		"Declare the standing /until-done goal complete. Only call this after producing externally verifiable evidence the done-criteria are satisfied.",
	block:
		"Pause the /until-done loop because user input is needed. Use when ask-before is triggered, when ambiguity blocks progress, or when an external dependency is missing.",
	progress:
		"Record a one-line progress note for the standing goal. Optional. Useful when a turn produced partial progress but is not yet done.",
};

export const TOOL_LABELS = {
	plan: "Until-done plan",
	replan: "Until-done replan",
	taskUpdate: "Until-done task update",
	set: "Until-done set",
	complete: "Until-done complete",
	block: "Until-done block",
	progress: "Until-done progress",
};

export const TOOL_RESULTS = {
	planAccepted: (count: number, firstId: string) =>
		`✓ Plan accepted: ${count} tasks. Starting at ${firstId}. Wrote .until-done/tasks.yaml`,
	replanApplied: (ops: number, reason: string) =>
		`↻ replan applied (${ops} ops): ${reason}`,
	taskUpdated: (id: string, currentTail: string) =>
		`✓ Task ${id} updated.${currentTail}`,
	setActivated:
		"✓ /until-done contract drafted. Pi will generate the task plan next.",
	completeMarked: (text: string) => `✓ Goal marked complete.\n${text}`,
	blocked: (q: string) => `? Blocked. Question for user:\n${q}`,
	progressNoted: (note: string) => `· progress noted: ${note}`,
	progressInPhase: (phase: string, note: string) => `· [${phase}] ${note}`,
};
