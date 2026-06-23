import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const RUST: LanguageProfile = {
	id: "rust",
	markers: ["Cargo.toml"],
	checks: [
		direct("typecheck", ["cargo", "check", "--quiet", "--all-targets"]),
		direct("lint", [
			"cargo",
			"clippy",
			"--quiet",
			"--all-targets",
			"--",
			"-D",
			"warnings",
		]),
		direct("format", ["cargo", "fmt", "--check"]),
		direct("compile", ["cargo", "check", "--quiet"]),
		direct("test", ["cargo", "test", "--quiet"]),
		direct("build", ["cargo", "build", "--quiet", "--release"]),
	],
};
