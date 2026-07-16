/**
 * @module paths
 * Shared path helpers for the `.pi/until/` process directory tree.
 *
 * All until-done process artefacts (tasks.yaml, distilled.md, research notes)
 * live under `.pi/until/<goalId>/` rather than in the project root or a
 * visible `.until-done/` directory. This keeps the project tree clean and
 * namespaces artefacts to the goal that produced them.
 *
 * `isInsidePiUntil` is used by the pre-plan write gate to decide whether a
 * proposed file write is inside the allowed scratch area during research /
 * analysis (status === "planning").
 */
import * as path from "node:path";

/** Root of the until-done artefact tree: `<cwd>/.pi/until/`. */
export const PI_UNTIL_ROOT = (cwd: string): string =>
	path.join(cwd, ".pi", "until");

/** Per-goal artefact directory: `<cwd>/.pi/until/<goalId>/`. */
export const piUntilGoalDir = (cwd: string, goalId: string): string =>
	path.join(PI_UNTIL_ROOT(cwd), goalId);

/** Returns true when `filePath` resolves inside the `.pi/until/` tree. */
export const isInsidePiUntil = (cwd: string, filePath: string): boolean => {
	const root = PI_UNTIL_ROOT(cwd);
	const resolved = path.isAbsolute(filePath)
		? filePath
		: path.resolve(cwd, filePath);
	const withSep = root.endsWith(path.sep) ? root : root + path.sep;
	return resolved === root || resolved.startsWith(withSep);
};
