import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const LUAU: LanguageProfile = {
	id: "luau",
	markers: [".luaurc", "luau.toml"],
	checks: [
		direct("typecheck", ["luau-analyze", "--quiet", "."]),
		direct("lint", ["selene", "--quiet", "."]),
		direct("format", ["stylua", "--check", "."]),
	],
};

export const ROBLOX: LanguageProfile = {
	id: "roblox-luau",
	markers: ["default.project.json", "rojo.json", "wally.toml"],
	checks: [
		direct("build", [
			"rojo",
			"build",
			"default.project.json",
			"-o",
			"build.rbxlx",
		]),
		direct("typecheck", ["luau-analyze", "--quiet", "."]),
		direct("test", ["lune", "run", "tests"]),
	],
};
