export const REFUSAL = {
	planWrongStatus: (status: string) =>
		`plan can only be set during 'active' or 'planning' (status=${status}).`,
	planUnknownDep: (taskId: string, dep: string) =>
		`task ${taskId} depends on unknown task ${dep}.`,
	replanWrongStatus: (status: string) =>
		`replan only allowed in 'active' (status=${status}).`,
	replanNoNorthStar: "northStar not set; call until_done_set first.",
	replanEmptyReason: "reason is required.",
	replanCycle: (taskId: string) =>
		`replan introduces dependency cycle through ${taskId}`,
	taskNotFound: (id: string) => `No task with id ${id}.`,
	goalExists: (status: string) =>
		`a goal is already ${status}. Cancel it with /until-done cancel first.`,
	planRejected: "plan rejected by user. Goal cleared.",
	noActiveGoal: (status: string) =>
		`Refused: no active goal (status=${status}).`,
	noActiveBlock: (status: string) =>
		`No active goal to block (status=${status}).`,
	notBlocked: (status: string) =>
		`goal is not blocked (status=${status}); no unblock needed.`,
	blockedTaskUpdate: (status: string) =>
		`cannot advance tasks while goal is ${status}. Call until_done_unblock or wait for user approval first.`,
	userDenied: (kind: string) => `user denied "${kind}"`,
	noUiAskBefore: (kind: string) =>
		`ask-before pattern "${kind}" matched but no interactive UI is available to confirm. Run interactively to approve, or remove the pattern from askBefore.`,
	judgeUnspecified:
		"every until_done_complete is gated by a judge LLM call. Cross-model is the default — set `judgeModel: { provider, modelId }` to a DIFFERENT model than the executor (the standard fix for Ralph-loop oscillation). If no second model is available, set `sameModelJudge: true` to use the executor itself with a fresh, completion-focused context. One of the two is required.",
};
