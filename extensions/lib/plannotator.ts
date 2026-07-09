import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Task } from "./types";

const REQUEST_CHANNEL = "plannotator:request";
const RESULT_CHANNEL = "plannotator:review-result";

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

const formatTaskLine = (task: Task): string => {
	const deps = task.dependencies.length
		? ` (deps: ${task.dependencies.join(", ")})`
		: "";
	return `- [ ] **${task.id}**: ${task.title}${deps}`;
};

export const formatPlanForPlannotator = (tasks: Task[]): string =>
	["# /until-done plan", "", ...tasks.map(formatTaskLine)].join("\n");

const PLANNOTATOR_TIMEOUT_MS = 3000;

const waitForResult = (
	pi: ExtensionAPI,
	reviewId: string,
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision | undefined> =>
	new Promise((resolve) => {
		let done = false;
		let unsubscribe: (() => void) | undefined;

		const finish = (value: PlannotatorDecision | undefined) => {
			if (done) return;
			done = true;
			unsubscribe?.();
			resolve(value);
		};

		const timeout = setTimeout(() => finish(undefined), PLANNOTATOR_TIMEOUT_MS);

		unsubscribe = pi.events.on(RESULT_CHANNEL, (data) => {
			const event = data as ReviewResultEvent;
			if (event.reviewId !== reviewId) return;
			clearTimeout(timeout);
			finish({ approved: event.approved, feedback: event.feedback });
		});

		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timeout);
				finish(undefined);
			},
			{ once: true },
		);
	});

const emitPlanReview = (
	pi: ExtensionAPI,
	planContent: string,
	planFilePath: string | undefined,
	respond: (response: ReviewStartResponse) => void,
): void => {
	pi.events.emit(REQUEST_CHANNEL, {
		requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		action: "plan-review",
		payload: { planContent, planFilePath },
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
	planFilePath?: string,
): Promise<PlannotatorDecision | undefined> => {
	const planContent = formatPlanForPlannotator(tasks);
	return new Promise((resolve) => {
		let done = false;
		const finish = (value: PlannotatorDecision | undefined) => {
			if (done) return;
			done = true;
			resolve(value);
		};

		// Timeout for initial plannotator response
		const initTimeout = setTimeout(
			() => finish(undefined),
			PLANNOTATOR_TIMEOUT_MS,
		);

		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(initTimeout);
				finish(undefined);
			},
			{ once: true },
		);

		emitPlanReview(pi, planContent, planFilePath, (response) => {
			clearTimeout(initTimeout);
			handleReviewStart(response, pi, signal, finish);
		});
	});
};

export const requestPlannotatorDocumentReview = async (
	pi: ExtensionAPI,
	title: string,
	document: string,
	planFilePath: string | undefined,
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision | undefined> => {
	const planContent = `# ${title}\n\n${document}`;
	return new Promise((resolve) => {
		let done = false;
		const finish = (value: PlannotatorDecision | undefined) => {
			if (done) return;
			done = true;
			resolve(value);
		};

		const initTimeout = setTimeout(
			() => finish(undefined),
			PLANNOTATOR_TIMEOUT_MS,
		);

		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(initTimeout);
				finish(undefined);
			},
			{ once: true },
		);

		emitPlanReview(pi, planContent, planFilePath, (response) => {
			clearTimeout(initTimeout);
			handleReviewStart(response, pi, signal, finish);
		});
	});
};
