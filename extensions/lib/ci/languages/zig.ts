import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const ZIG: LanguageProfile = {
	id: "zig",
	markers: ["build.zig", "build.zig.zon"],
	checks: [
		direct("compile", ["zig", "build", "--summary", "all"]),
		direct("test", ["zig", "build", "test"]),
		direct("format", ["zig", "fmt", "--check", "."]),
	],
};
