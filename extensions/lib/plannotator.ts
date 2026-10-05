/**
 * Plannotator bridge: requests a browser plan review over Plannotator's
 * shared `plannotator:request` event API (no plan mode) and waits for the
 * user's decision on `plannotator:review-result`.
 *
 * More than one listener can answer a request — e.g. Plannotator installed
 * both globally and in project settings leaves an orphaned listener without
 * a session context that fails instantly. The first `handled` answer wins;
 * a failure only ends the request once every listener has failed.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { REFUSAL } from "./strings";
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
	kind: "decided";
	approved: boolean;
	feedback?: string;
};

export type PlannotatorOutcome =
	| PlannotatorDecision
	| { kind: "unavailable"; reason: string };

const unavailable = (reason: string): PlannotatorOutcome => ({
	kind: "unavailable",
	reason,
});

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
): Promise<PlannotatorOutcome> =>
	new Promise((resolve) => {
		let done = false;
		let unsubscribe: (() => void) | undefined;

		const finish = (value: PlannotatorOutcome) => {
			if (done) return;
			done = true;
			unsubscribe?.();
			resolve(value);
		};

		unsubscribe = pi.events.on(RESULT_CHANNEL, (data) => {
			const event = data as ReviewResultEvent;
			if (event.reviewId !== reviewId) return;
			finish({ kind: "decided", ...pickDecision(event) });
		});

		signal?.addEventListener(
			"abort",
			() => finish(unavailable(REFUSAL.plannotatorCancelled)),
			{ once: true },
		);
	});

const pickDecision = (event: ReviewResultEvent) => ({
	approved: event.approved,
	feedback: event.feedback,
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

const reviewIdOf = (response: ReviewStartResponse): string | undefined =>
	response.status === "handled" && response.result.status === "pending"
		? response.result.reviewId || undefined
		: undefined;

const failureReason = (response: ReviewStartResponse): string =>
	("error" in response && response.error) || REFUSAL.plannotatorNoReason;

/**
 * Collects answers from every listener: starts waiting on the first accepted
 * review, and gives up only after `listeners` answers have all failed.
 */
const createResponseHandler = (
	pi: ExtensionAPI,
	listeners: number,
	signal: AbortSignal | undefined,
	finish: (value: PlannotatorOutcome) => void,
	onAccepted: () => void,
) => {
	let accepted = false;
	const failures: string[] = [];
	return (response: ReviewStartResponse): void => {
		const reviewId = reviewIdOf(response);
		if (accepted) return;
		if (reviewId) {
			accepted = true;
			onAccepted();
			void waitForResult(pi, reviewId, signal).then(finish);
			return;
		}
		failures.push(failureReason(response));
		if (failures.length >= listeners) finish(unavailable(failures.join(" ")));
	};
};

/** Counts the listeners that answer a cheap `review-status` probe. */
const countListeners = (pi: ExtensionAPI): Promise<number> =>
	new Promise((resolve) => {
		let count = 0;
		setTimeout(() => resolve(count), PROBE_MS);
		pi.events.emit(REQUEST_CHANNEL, {
			requestId: `probe-${Date.now()}`,
			action: "review-status",
			payload: { reviewId: "probe" },
			respond: () => {
				count += 1;
			},
		});
	});

export const isPlannotatorAvailable = async (
	pi: ExtensionAPI,
): Promise<boolean> => (await countListeners(pi)) > 0;

const requestReview = async (
	pi: ExtensionAPI,
	planContent: string,
	planFilePath: string | undefined,
	signal: AbortSignal | undefined,
): Promise<PlannotatorOutcome> => {
	const listeners = await countListeners(pi);
	if (listeners === 0) return unavailable(REFUSAL.plannotatorNotInstalled);
	return new Promise((resolve) => {
		let done = false;
		const finish = (value: PlannotatorOutcome) => {
			if (done) return;
			done = true;
			clearTimeout(initTimeout);
			resolve(value);
		};
		const initTimeout = setTimeout(
			() => finish(unavailable(REFUSAL.plannotatorStartTimeout)),
			START_MS,
		);
		const onAbort = () => finish(unavailable(REFUSAL.plannotatorCancelled));
		signal?.addEventListener("abort", onAbort, { once: true });
		const respond = createResponseHandler(pi, listeners, signal, finish, () =>
			clearTimeout(initTimeout),
		);
		emitPlanReview(pi, planContent, planFilePath, respond);
	});
};

export const requestPlannotatorPlanReview = (
	pi: ExtensionAPI,
	tasks: Task[],
	signal: AbortSignal | undefined,
	planFilePath?: string,
): Promise<PlannotatorOutcome> =>
	requestReview(pi, formatPlanForPlannotator(tasks), planFilePath, signal);

export const requestPlannotatorDocumentReview = (
	pi: ExtensionAPI,
	title: string,
	document: string,
	planFilePath: string | undefined,
	signal: AbortSignal | undefined,
): Promise<PlannotatorOutcome> =>
	requestReview(pi, `# ${title}\n\n${document}`, planFilePath, signal);
