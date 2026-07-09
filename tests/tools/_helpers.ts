import { fauxAssistantMessage, fauxToolCall } from "@mariozechner/pi-ai";
import { makeNorthStar } from "../helpers/factories";
import type { TestRuntime } from "../helpers/runtime-harness";

export const seedActive = (runtime: TestRuntime): void => {
	runtime.store.state = {
		...runtime.store.state,
		status: "active",
		id: "ud-test",
		goal: "ship X",
		northStar: makeNorthStar(),
		confirmedByUser: true,
		maxTurns: 100,
		planningPhase: "tasks", // Assume plan document already approved for task submission
	};
};

export const seedPlanning = (runtime: TestRuntime): void => {
	runtime.store.state = {
		...runtime.store.state,
		status: "planning",
		id: "ud-test",
		goal: "ship X",
		northStar: makeNorthStar(),
		maxTurns: 100,
		planningPhase: "document", // Ready for plan document submission
	};
};

export const driveToolCall = async (
	runtime: TestRuntime,
	name: string,
	args: Record<string, unknown>,
): Promise<void> => {
	runtime.setLLM([
		fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" }),
		fauxAssistantMessage("done", { stopReason: "stop" }),
	]);
	await runtime.prompt("run the tool");
};
