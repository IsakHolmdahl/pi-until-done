import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const LUA: LanguageProfile = {
	id: "lua",
	markers: [".luarc.json", ".luarc.jsonc", ".luacheckrc", "init.lua"],
	checks: [
		direct("lint", ["luacheck", "--no-color", "."]),
		direct("format", ["stylua", "--check", "."]),
		direct("test", ["busted"]),
		direct("typecheck", ["lua-language-server", "--check", "."]),
	],
};
