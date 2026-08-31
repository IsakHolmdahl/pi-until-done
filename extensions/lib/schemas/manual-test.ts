/** Schemas for bug reports and post-completion improvement pitches. */

import { Type } from "typebox";

export const ReportBugParams = Type.Object({
	description: Type.String({
		description: "Observed bug and reproduction details.",
	}),
	severity: Type.Union([Type.Literal("major"), Type.Literal("minor")], {
		description: "Severity explicitly supplied by the user.",
	}),
});

export const ResolveBugParams = Type.Object({
	bugId: Type.String({ description: "Bug identifier returned by report." }),
	evidence: Type.String({
		description: "Evidence that the fix was completed.",
	}),
});

export const ImprovementPitchParams = Type.Object({
	pitch: Type.String({ description: "The user's proposed improvement." }),
});
