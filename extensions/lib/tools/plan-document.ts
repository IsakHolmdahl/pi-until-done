import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Static } from "typebox";
import { PlanDocumentParams } from "../schemas/plan-document";
import { persist, type Store } from "../store";
import {
	NOTIFY,
	TOOL_DESCRIPTIONS,
	TOOL_LABELS,
	TOOL_RESULTS,
} from "../strings";
import { refreshStatus } from "../ui/status-line";
import { refreshWidget } from "../ui/widget";
import { writePlanDocument } from "../yaml-writer";
import { ok, refused } from "./result";

type PlanDocumentInput = Static<typeof PlanDocumentParams>;

const validatePlanDocument = (
	store: Store,
	_params: PlanDocumentInput,
): string | undefined => {
	const s = store.state;
	if (s.status !== "planning") {
		return `Cannot submit plan document: goal status is '${s.status}', not 'planning'.`;
	}
	return undefined;
};

const executePlanDocument = async (
	pi: ExtensionAPI,
	store: Store,
	params: PlanDocumentInput,
	ctx: ExtensionContext,
) => {
	const err = validatePlanDocument(store, params);
	if (err) return refused(err, "invalid_state");

	// Generate goal slug for directory name
	const goalSlug = store.state.goal
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 50);

	// Write plan document to .pi/until-done/{goal-name}/plan.md
	const planPath = writePlanDocument(ctx.cwd, goalSlug, params.planDocument);

	// Update state
	persist(
		pi,
		store,
		"plan_document",
		{
			planningPhase: "document",
			planDocumentPath: planPath,
		},
		"Plan document submitted",
	);

	// Try plannotator review
	// TODO: Implement plannotator review for plan document
	// For now, auto-approve if no UI, otherwise show confirmation
	if (!ctx.hasUI) {
		persist(
			pi,
			store,
			"plan_document_approved",
			{
				planningPhase: "tasks",
			},
			"Plan document auto-approved",
		);
		return ok(TOOL_RESULTS.planDocumentApproved(planPath), {
			approved: true,
			nextPhase: "tasks",
		});
	}

	// Show confirmation dialog
	const confirmed = await ctx.ui.confirm(
		"Approve plan document?",
		`Plan document saved to: ${planPath}\n\nDo you want to approve this plan and proceed to task generation?`,
	);

	if (confirmed) {
		persist(
			pi,
			store,
			"plan_document_approved",
			{
				planningPhase: "tasks",
			},
			"Plan document approved",
		);
		ctx.ui.notify(NOTIFY.planDocumentApproved, "info");
		refreshStatus(store, ctx);
		refreshWidget(store, ctx, true);
		return ok(TOOL_RESULTS.planDocumentApproved(planPath), {
			approved: true,
			nextPhase: "tasks",
		});
	} else {
		persist(
			pi,
			store,
			"plan_document_rejected",
			{
				planningPhase: "document",
			},
			"Plan document rejected",
		);
		ctx.ui.notify(NOTIFY.planDocumentRejected, "warning");
		refreshStatus(store, ctx);
		refreshWidget(store, ctx, true);
		return refused(
			TOOL_RESULTS.planDocumentRejected(),
			"plan_document_rejected",
		);
	}
};

export const registerPlanDocumentTool = (
	pi: ExtensionAPI,
	store: Store,
): void => {
	pi.registerTool({
		name: "until_done_plan_document",
		label: TOOL_LABELS.planDocument,
		description: TOOL_DESCRIPTIONS.planDocument,
		parameters: PlanDocumentParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return executePlanDocument(pi, store, params, ctx);
		},
	});
};
