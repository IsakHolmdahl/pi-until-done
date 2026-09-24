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

const PROBE_MS = 50;
// Plannotator calls respond() only after the browser session starts.
// A short timeout here is a false "not installed" and skips the UI.
const START_MS = 60_000;

// waitForResult has no timeout: once plannotator has accepted the review it
// owns the decision. Only an abort signal (user Esc) cancels the wait.
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

		unsubscribe = pi.events.on(RESULT_CHANNEL, (data) => {
			const event = data as ReviewResultEvent;
			if (event.reviewId !== reviewId) return;
			finish({ approved: event.approved, feedback: event.feedback });
		});

		signal?.addEventListener("abort", () => finish(undefined), { once: true });
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

const listenerPresent = (pi: ExtensionAPI): Promise<boolean> =>
	new Promise((resolve) => {
		let done = false;
		const finish = (value: boolean) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			resolve(value);
		};
		const timer = setTimeout(() => finish(false), PROBE_MS);
		pi.events.emit(REQUEST_CHANNEL, {
			requestId: `probe-${Date.now()}`,
			action: "review-status",
			payload: { reviewId: "probe" },
			respond: () => finish(true),
		});
	});

const requestReview = async (
	pi: ExtensionAPI,
	planContent: string,
	planFilePath: string | undefined,
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision | undefined> => {
	if (!(await listenerPresent(pi))) return undefined;
	return new Promise((resolve) => {
		let done = false;
		const finish = (value: PlannotatorDecision | undefined) => {
			if (done) return;
			done = true;
			clearTimeout(initTimeout);
			resolve(value);
		};
		const initTimeout = setTimeout(() => finish(undefined), START_MS);
		signal?.addEventListener("abort", () => finish(undefined), { once: true });
		emitPlanReview(pi, planContent, planFilePath, (response) => {
			clearTimeout(initTimeout);
			handleReviewStart(response, pi, signal, finish);
		});
	});
};

export const requestPlannotatorPlanReview = (
	pi: ExtensionAPI,
	tasks: Task[],
	signal: AbortSignal | undefined,
	planFilePath?: string,
): Promise<PlannotatorDecision | undefined> =>
	requestReview(pi, formatPlanForPlannotator(tasks), planFilePath, signal);

export const requestPlannotatorDocumentReview = (
	pi: ExtensionAPI,
	title: string,
	document: string,
	planFilePath: string | undefined,
	signal: AbortSignal | undefined,
): Promise<PlannotatorDecision | undefined> =>
	requestReview(pi, `# ${title}\n\n${document}`, planFilePath, signal);
