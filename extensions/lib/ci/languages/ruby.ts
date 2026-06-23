import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const RUBY: LanguageProfile = {
	id: "ruby",
	markers: ["Gemfile", ".ruby-version", "Rakefile"],
	checks: [
		direct("typecheck", ["srb", "tc"]),
		direct("lint", ["bundle", "exec", "rubocop", "--no-color"]),
		direct("format", ["bundle", "exec", "rubocop", "--no-color", "--lint"]),
		direct("test", ["bundle", "exec", "rake", "test"]),
	],
};
