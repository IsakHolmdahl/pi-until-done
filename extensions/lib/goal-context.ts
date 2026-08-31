/** Builds concise context carried from a completed goal into its follow-up goal. */

import type { GoalState } from "./types";

const taskLearnings = (state: GoalState): string[] =>
	state.tasks.flatMap((task) => [
		...task.learnings.map((item) => `- Learning: ${item}`),
		...task.gotchas.map((item) => `- Gotcha: ${item}`),
	]);

export const carryForwardContext = (state: GoalState): string => {
	const lines = ["Previous until-done context:"];
	if (state.distilled) lines.push("Distilled journey:", state.distilled);
	const learnings = taskLearnings(state);
	if (learnings.length) lines.push("Task learnings and gotchas:", ...learnings);
	return lines.length === 1 ? "" : lines.join("\n");
};
