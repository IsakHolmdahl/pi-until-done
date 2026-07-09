export const TOOL_DESCRIPTIONS = {
	proposePlan:
		"Provide the comprehensive TDD-first task list for the active /until-done goal. Call once after `until_done_draft_plan` is approved; this triggers the user approval dialog.",
	replan:
		"Modify the task list mid-execution: insert / remove / replace / split / merge / reorder. The North Star (goal, doneCriteria, verifyCommand, askBefore) is LOCKED — call `/until-done cancel` if you need to change those. `done` tasks are immutable. Every call must include a `reason` (one short sentence) which is appended to affected tasks' learnings.",
	taskUpdate:
		"Patch a single task in the live plan. Use to mark status transitions, append learnings, append gotchas, add context references, refine validation steps, or update guardrails. The .until-done/tasks.yaml file is rewritten after each call.",
	setContract:
		"Draft the /until-done North Star contract. Fills in goal, doneCriteria, askBefore[], and decisionStyle. Moves goal from 'setup' to 'planning'; tasks follow with `until_done_propose_plan`.",
	complete:
		"Declare the standing /until-done goal complete. Only call this after producing externally verifiable evidence the done-criteria are satisfied. REVIEWER APPROVAL REQUIRED: You must have reviewer subagents approve the implementation (code quality, security, best practices) before calling this tool.",
	block:
		"Pause the /until-done loop because user input is needed. Use when ask-before is triggered, when ambiguity blocks progress, or when an external dependency is missing.",
	unblock:
		"Clear a blocked /until-done goal after the user has approved the ask-before item or resolved the blocking question. Call this immediately upon receiving approval, before resuming work.",
	progress:
		"Record a one-line progress note for the standing goal. Optional. Useful when a turn produced partial progress but is not yet done.",
	reviewerApprove:
		"Signal reviewer approval or rejection of the implementation. Reviewers must call this tool to approve the implementation before the judge can be called. Reviewers should focus on code quality, security flaws, and best practices — NOT on requirements (that's the judge's job). Call with approved=true to allow judge review, or approved=false with feedback to request changes.",
	draftPlan:
		"Submit the plan document (markdown) for review. FIRST step in planning. Explains approach, architecture, and implementation strategy. Reviewed by plannotator before tasks are generated.",
};

export const TOOL_LABELS = {
	proposePlan: "Until-done propose plan",
	replan: "Until-done replan",
	taskUpdate: "Until-done task update",
	setContract: "Until-done set contract",
	complete: "Until-done complete",
	block: "Until-done block",
	unblock: "Until-done unblock",
	progress: "Until-done progress",
	reviewerApprove: "Until-done reviewer approve",
	draftPlan: "Until-done draft plan",
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
	unblocked: (reason?: string) =>
		`✓ Block cleared${reason ? `: ${reason}` : ""}. Resuming work.`,
	progressNoted: (note: string) => `· progress noted: ${note}`,
	progressInPhase: (phase: string, note: string) => `· [${phase}] ${note}`,
	reviewerApproved: () =>
		"✓ Reviewer approved implementation for judge review.",
	reviewerRejected: () =>
		"✗ Reviewer rejected implementation. Address feedback before requesting judge review.",
	planDocumentApproved: (path: string) =>
		`✓ Plan document approved and saved to ${path}. You can now generate tasks with until_done_propose_plan.`,
	planDocumentRejected: () =>
		"✗ Plan document rejected. Revise the plan document and resubmit with until_done_draft_plan.",
};
