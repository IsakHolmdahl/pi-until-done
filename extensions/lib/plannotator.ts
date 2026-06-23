import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Task } from "./types";

const REQUEST_CHANNEL = "plannotator:request";
const RESULT_CHANNEL = "plannotator:review-result";
const PLAN_SUBMIT_TOOL = "plannotator_submit_plan";

type ReviewStartResponse =
	| { status: "handled"; result: { status: "pending"; reviewId: string } }
	| { status: "error" | "unavailable"; error?: string };

type ReviewResultEvent = {
	reviewId: string;
	approved: boolean;
	feedback?: string;
};

export type PlannotatorDecision = {
	approved: boolean;
	feedback?: string;
};

export const isPlannotatorInstalled = (pi: ExtensionAPI): boolean =>
	pi.getAllTools().some((tool) => tool.name === PLAN_SUBMIT_TOOL);

const formatTaskLine = (task: Task): string => {
	const deps = task.dependencies.length
		? ` (deps: ${task.dependencies.join(", ")})`
		: "";
	return `- [ ] **${task.id}**: ${task.title}${deps}`;
};

export const formatPlanForPlannotator = (tasks: Task[]): string =>
	["# /until-done plan", "", ...tasks.map(formatTaskLine)].join("\n");

const waitForResult = (
	pi: ExtensionAPI,
	reviewId: string,
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision | undefined> =>
	new Promise((resolve) => {
		let done = false;
		const unsubscribe = pi.events.on(RESULT_CHANNEL, (data) => {
			const event = data as ReviewResultEvent;
			if (event.reviewId !== reviewId) return;
			done = true;
			unsubscribe();
			resolve({ approved: event.approved, feedback: event.feedback });
		});
		const abort = () => {
			if (done) return;
			done = true;
			unsubscribe();
			resolve(undefined);
		};
		signal?.addEventListener("abort", abort, { once: true });
	});

const emitPlanReview = (
	pi: ExtensionAPI,
	planContent: string,
	respond: (response: ReviewStartResponse) => void,
): void => {
	pi.events.emit(REQUEST_CHANNEL, {
		requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		action: "plan-review",
		payload: { planContent },
		respond,
	});
};

const handleReviewStart = (
	response: ReviewStartResponse,
	pi: ExtensionAPI,
	signal: AbortSignal | undefined,
	finish: (value: PlannotatorDecision | undefined) => void,
): void => {
	if (
		response.status !== "handled" ||
		response.result.status !== "pending" ||
		!response.result.reviewId
	) {
		finish(undefined);
		return;
	}
	void waitForResult(pi, response.result.reviewId, signal).then(finish);
};

export const requestPlannotatorPlanReview = async (
	pi: ExtensionAPI,
	tasks: Task[],
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision | undefined> => {
	const planContent = formatPlanForPlannotator(tasks);
	return new Promise((resolve) => {
		let done = false;
		const finish = (value: PlannotatorDecision | undefined) => {
			if (done) return;
			done = true;
			resolve(value);
		};
		signal?.addEventListener("abort", () => finish(undefined), { once: true });
		emitPlanReview(pi, planContent, (response) =>
			handleReviewStart(response, pi, signal, finish),
		);
	});
};
