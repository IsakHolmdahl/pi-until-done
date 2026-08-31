import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Store } from "../store";
import { registerDistillTool } from "./distill";
import { registerLifecycleTools } from "./lifecycle";
import { registerManualTestTools } from "./manual-test";
import { registerPlanTool } from "./plan";
import { registerPlanDocumentTool } from "./plan-document";
import { registerReplanTool } from "./replan";
import { registerReviewerApproveTool } from "./reviewer-approve";
import { registerTaskUpdateTool } from "./task-update";

export const registerTools = (pi: ExtensionAPI, store: Store): void => {
	registerPlanDocumentTool(pi, store);
	registerPlanTool(pi, store);
	registerReplanTool(pi, store);
	registerTaskUpdateTool(pi, store);
	registerLifecycleTools(pi, store);
	registerDistillTool(pi, store);
	registerReviewerApproveTool(pi, store);
	registerManualTestTools(pi, store);
};
