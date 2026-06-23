import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const SWIFT: LanguageProfile = {
	id: "swift",
	markers: ["Package.swift"],
	checks: [
		direct("compile", ["swift", "build", "--quiet"]),
		direct("test", ["swift", "test", "--quiet"]),
		direct("format", ["swift-format", "lint", "--recursive", "."]),
		direct("lint", ["swiftlint", "lint", "--quiet"]),
	],
};
