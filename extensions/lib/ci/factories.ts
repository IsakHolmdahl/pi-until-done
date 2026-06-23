import type { CiCheck, CiVerb } from "./types";

const SECOND = 1000;

export const TIMEOUTS: Record<CiVerb, number> = {
	typecheck: 30 * SECOND,
	lint: 20 * SECOND,
	format: 15 * SECOND,
	compile: 60 * SECOND,
	test: 120 * SECOND,
	build: 180 * SECOND,
};

export const direct = (verb: CiVerb, cmd: readonly string[]): CiCheck => ({
	verb,
	argv: [...cmd],
	timeoutMs: TIMEOUTS[verb],
});
