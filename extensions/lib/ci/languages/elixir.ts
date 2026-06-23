import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const ELIXIR: LanguageProfile = {
	id: "elixir",
	markers: ["mix.exs"],
	checks: [
		direct("typecheck", ["mix", "dialyzer", "--quiet"]),
		direct("lint", ["mix", "credo", "--strict"]),
		direct("format", ["mix", "format", "--check-formatted"]),
		direct("compile", ["mix", "compile", "--warnings-as-errors"]),
		direct("test", ["mix", "test"]),
	],
};

export const ERLANG: LanguageProfile = {
	id: "erlang",
	markers: ["rebar.config", "rebar.lock"],
	checks: [
		direct("compile", ["rebar3", "compile"]),
		direct("typecheck", ["rebar3", "dialyzer"]),
		direct("test", ["rebar3", "eunit"]),
	],
};
