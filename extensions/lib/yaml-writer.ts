import * as fs from "node:fs";
import { stringify as yamlStringify } from "yaml";
import { piUntilGoalDir } from "./paths";
import type { GoalState } from "./types";

const buildYaml = (s: GoalState) => ({
	generated: new Date().toISOString(),
	goalId: s.id,
	goal: s.goal,
	doneCriteria: s.doneCriteria,
	verifyCommand: s.verifyCommand,
	phase: s.phase,
	askBefore: s.askBefore,
	decisionStyle: s.decisionStyle,
	budget: { used: s.turnsUsed, max: s.maxTurns },
	currentTaskId: s.currentTaskId,
	tasks: s.tasks,
});

export const writeTasksYaml = (cwd: string, s: GoalState): void => {
	try {
		const dir = piUntilGoalDir(cwd, s.id);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(`${dir}/tasks.yaml`, yamlStringify(buildYaml(s)));
	} catch {
		// best-effort; never fail the goal because of disk issues
	}
};

export const writePlanDocument = (
	cwd: string,
	goalSlug: string,
	planDocument: string,
): string => {
	try {
		const dir = path.join(cwd, ".pi", "until-done", goalSlug);
		fs.mkdirSync(dir, { recursive: true });
		const planPath = path.join(dir, "plan.md");
		fs.writeFileSync(planPath, planDocument);
		return planPath;
	} catch {
		// best-effort; never fail the goal because of disk issues
		return "";
	}
};

export const writeTasksYamlToPiDir = (
	cwd: string,
	goalSlug: string,
	s: GoalState,
): string => {
	try {
		const dir = path.join(cwd, ".pi", "until-done", goalSlug);
		fs.mkdirSync(dir, { recursive: true });
		const tasksPath = path.join(dir, "tasks.yaml");
		fs.writeFileSync(tasksPath, yamlStringify(buildYaml(s)));
		return tasksPath;
	} catch {
		// best-effort; never fail the goal because of disk issues
		return "";
	}
};
