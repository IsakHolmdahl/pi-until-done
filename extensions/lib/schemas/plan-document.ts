import { Type } from "typebox";

export const PlanDocumentParams = Type.Object({
	planDocument: Type.String({
		description:
			"Plain markdown plan document explaining the approach, architecture decisions, and implementation strategy. This is reviewed BEFORE tasks are generated.",
	}),
});
