import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";

import { ReviewerApproveParams } from "../schemas/reviewer-approve";
import { persist, type Store } from "../store";
import {
	NOTIFY,
	TOOL_DESCRIPTIONS,
	TOOL_LABELS,
	TOOL_RESULTS,
} from "../strings";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";
import { ok, refused } from "./result";

type ReviewerApproveInput = {
	approved: boolean;
	feedback?: string;
};

const validateReviewerApprove = (
	store: Store,
	_params: ReviewerApproveInput,
): string | undefined => {
	const s = store.state;
	if (s.status !== "active") {
		return `Cannot approve: goal status is '${s.status}', not 'active'.`;
	}
	return undefined;
};

const executeReviewerApprove = (
	pi: ExtensionAPI,
	store: Store,
	params: ReviewerApproveInput,
	ctx: ExtensionContext,
) => {
	const err = validateReviewerApprove(store, params);
	if (err) return refused(err, "wrong_status");

	if (params.approved) {
		persist(
			pi,
			store,
			"reviewer_approve",
			{
				reviewerApproved: true,
			},
			params.feedback ?? "Reviewer approved",
		);
		ctx.ui.notify(NOTIFY.reviewerApproved, "info");
		refreshStatus(store, ctx);
		refreshWidget(store, ctx, true);
		return ok(TOOL_RESULTS.reviewerApproved(), { approved: true });
	} else {
		persist(
			pi,
			store,
			"reviewer_reject",
			{
				reviewerApproved: false,
			},
			params.feedback ?? "Reviewer rejected",
		);
		ctx.ui.notify(NOTIFY.reviewerRejected, "warning");
		refreshStatus(store, ctx);
		refreshWidget(store, ctx, true);
		return refused(
			params.feedback ?? TOOL_RESULTS.reviewerRejected(),
			"reviewer_rejected",
		);
	}
};

export const registerReviewerApproveTool = (
	pi: ExtensionAPI,
	store: Store,
): void => {
	pi.registerTool({
		name: "until_done_reviewer_approve",
		label: TOOL_LABELS.reviewerApprove,
		description: TOOL_DESCRIPTIONS.reviewerApprove,
		parameters: ReviewerApproveParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executeReviewerApprove(pi, store, params, ctx);
		},
	});
};
