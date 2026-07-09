import { Type } from "typebox";

export const ReviewerApproveParams = Type.Object({
	approved: Type.Boolean({
		description: "Whether the reviewer approves the implementation for judge review.",
	}),
	feedback: Type.Optional(Type.String({
		description: "Optional feedback from the reviewer about what needs to be addressed before judge review.",
	})),
});
