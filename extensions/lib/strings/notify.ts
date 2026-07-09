const LIFECYCLE = {
	flagOpening: (g: string) => `/until-done flag set — opening setup for: ${g}`,
	coexistGoal:
		"Note: @qhn/pi-goal is also installed. /until-done and /goal coexist — pick one per session.",
	setupStarted: (intent: string) =>
		`/until-done · setup started for "${intent}"`,
	planApproved: "/until-done · plan approved. Pi will activate now.",
	planRejected:
		"/until-done · plan rejected. Revise and resubmit via until_done_plan.",
	paused: "/until-done paused.",
	resumed: (g: string) => `/until-done resumed (budget reset). Goal: ${g}`,
	cancelled: "/until-done cancelled.",
	noGoalToCancel: "No goal to cancel.",
	nothingToResume: "Nothing to resume.",
	nothingToPause: (status: string) => `Nothing to pause (status=${status}).`,
	nothingToUnblock: (status: string) =>
		`Nothing to unblock (status=${status}).`,
	unblocked: "/until-done · block cleared. Resuming work.",
	autopilotEnabled:
		"/until-done · autopilot ON. Future setups will skip the plan confirmation dialog.",
	autopilotDisabled:
		"/until-done · autopilot OFF. Future setups will require the plan confirmation dialog.",
	reviewerApproved: "/until-done · Reviewer approved implementation for judge review.",
	reviewerRejected: "/until-done · Reviewer rejected implementation. Address feedback before judge review.",
};

const INSPECTION = {
	noActiveGoal: "No active /until-done goal.",
	noTasksYet:
		"No tasks yet. After /until-done <intent> is set, Pi will call `until_done_plan` to generate the list.",
	noPlanYet: "No plan written yet. Pi must call until_done_plan first.",
	livePlanAt: (p: string) => `Live task list: ${p}`,
	noNorthStar: "No active goal. Run /until-done <intent> first.",
	noReplans: "No replans on record.",
};

const BUDGET = {
	budgetRange: (max: number) => `Budget must be an integer 1..${max}.`,
	budgetSet: (n: number) => `/until-done · budget set to ${n}.`,
	budgetExhausted: (used: number, max: number) =>
		`/until-done paused: budget exhausted (${used}/${max}). Use /until-done resume to continue.`,
	spinGuard:
		"/until-done blocked: agent made no progress this turn. /until-done resume to retry.",
};

export const NOTIFY = { ...LIFECYCLE, ...INSPECTION, ...BUDGET };
