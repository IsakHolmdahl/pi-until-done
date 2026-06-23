import type { Task } from "../../extensions/lib/types";

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
	id: "T-001",
	title: "stub task",
	phase: "analysis",
	status: "pending",
	dependencies: [],
	blocks: [],
	prerequisites: [],
	validationSteps: [],
	ciCommands: [],
	styleguideRules: [],
	guardrails: [],
	learnings: [],
	gotchas: [],
	context: [],
	...overrides,
});

export const makeNorthStar = () => ({
	goal: "ship X",
	doneCriteria: "all green",
	verifyCommand: "bun test",
	askBefore: ["rm -rf"],
	decisionStyle: "fast and decisive",
	goalType: "ticket" as const,
	surfaces: [],
	// Default test northStars use same-model self-judge so seedActive(rt)
	// produces a contract that's valid against the executor faux without
	// requiring a second provider.
	sameModelJudge: true,
});

export const makeSetParams = () => ({
	goal: "ship X",
	doneCriteria: "all green",
	verifyCommand: "bun test",
	askBefore: ["rm -rf"],
	decisionStyle: "fast and decisive",
	goalType: "ticket" as const,
	surfaces: [],
	// Default test contracts opt into same-model self-judge so test setup
	// stays simple. Tests that exercise cross-model behavior override this
	// with an explicit `judgeModel`.
	sameModelJudge: true,
});

export const makeJudgeModel = () => ({
	provider: "faux-judge",
	modelId: "faux-1",
});
