import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Store } from "../store";
import { registerDistillTool } from "./distill";
import { registerLifecycleTools } from "./lifecycle";
import { registerPlanTool } from "./plan";
import { registerReplanTool } from "./replan";
import { registerReviewerApproveTool } from "./reviewer-approve";
import { registerTaskUpdateTool } from "./task-update";

export const registerTools = (pi: ExtensionAPI, store: Store): void => {
	registerPlanTool(pi, store);
	registerReplanTool(pi, store);
	registerTaskUpdateTool(pi, store);
	registerLifecycleTools(pi, store);
	registerDistillTool(pi, store);
	registerReviewerApproveTool(pi, store);
};
