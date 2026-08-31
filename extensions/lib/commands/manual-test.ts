/** User-facing commands for manual-test bug intake and improvements. */

import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { REFUSAL } from "../strings";
import { executeReportBug } from "../tools/manual-test";
import type { BugSeverity } from "../types";

const isSeverity = (value: string): value is BugSeverity =>
	value === "major" || value === "minor";

export const cmdBug = async (
	pi: ExtensionAPI,
	store: Parameters<typeof executeReportBug>[1],
	ctx: ExtensionCommandContext,
	raw: string,
): Promise<void> => {
	const [severity, ...description] = raw.trim().split(/\s+/);
	if (!severity || !isSeverity(severity) || !description.length) {
		ctx.ui.notify(REFUSAL.bugSeverityRequired, "warning");
		return;
	}
	const result = await executeReportBug(
		pi,
		store,
		{ severity, description: description.join(" ") },
		ctx,
	);
	ctx.ui.notify(result.content[0].text, result.isError ? "warning" : "info");
};
