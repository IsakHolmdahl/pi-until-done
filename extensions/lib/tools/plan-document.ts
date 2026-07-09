import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Static } from "typebox";
import { requestPlannotatorDocumentReview } from "../plannotator";
import { PlanDocumentParams } from "../schemas/plan-document";
import { persist, type Store } from "../store";
import {
	DIALOGS,
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
	signal: AbortSignal | undefined,
	ctx: ExtensionContext,
) => {
	const err = validatePlanDocument(store, params);
	if (err) return refused(err, "invalid_state");

	const goalSlug = store.state.goal
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 50);

	const planPath = writePlanDocument(ctx.cwd, goalSlug, params.planDocument);

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

	// Try plannotator review first
	const decision = await requestPlannotatorDocumentReview(
		pi,
		"/until-done plan document",
		params.planDocument,
		planPath,
		signal,
	);
	if (decision) {
		if (decision.approved) {
			return approvePlanDocument(pi, store, ctx, planPath);
		} else {
			return rejectPlanDocument(pi, store, ctx, decision.feedback);
		}
	}

	// No plannotator — fall back to user confirmation
	if (store.autopilotEnabled || !ctx.hasUI) {
		return approvePlanDocument(pi, store, ctx, planPath);
	}

	const confirmed = await ctx.ui.confirm(
		DIALOGS.approveTitle,
		`Plan document saved to: ${planPath}\n\nDo you want to approve this plan and proceed to task generation?`,
	);

	if (confirmed) {
		return approvePlanDocument(pi, store, ctx, planPath);
	} else {
		return rejectPlanDocument(pi, store, ctx);
	}
};

const approvePlanDocument = (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
	planPath: string,
) => {
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
};

const rejectPlanDocument = (
	pi: ExtensionAPI,
	store: Store,
	ctx: ExtensionContext,
	feedback?: string,
) => {
	persist(
		pi,
		store,
		"plan_document_rejected",
		{
			planningPhase: "document",
		},
		feedback ?? "Plan document rejected",
	);
	ctx.ui.notify(NOTIFY.planDocumentRejected, "warning");
	refreshStatus(store, ctx);
	refreshWidget(store, ctx, true);
	return refused(
		feedback ?? TOOL_RESULTS.planDocumentRejected(),
		"plan_document_rejected",
	);
};

export const registerPlanDocumentTool = (
	pi: ExtensionAPI,
	store: Store,
): void => {
	pi.registerTool({
		name: "until_done_draft_plan",
		label: TOOL_LABELS.draftPlan,
		description: TOOL_DESCRIPTIONS.draftPlan,
		parameters: PlanDocumentParams,
		async execute(_id, params, signal, _onUpdate, ctx) {
			return executePlanDocument(pi, store, params, signal, ctx);
		},
	});
};
