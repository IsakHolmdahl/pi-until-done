import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const DOTNET: LanguageProfile = {
	id: "dotnet",
	markers: ["global.json", "Directory.Build.props"],
	checks: [
		direct("compile", [
			"dotnet",
			"build",
			"--no-restore",
			"--nologo",
			"-v",
			"quiet",
		]),
		direct("format", [
			"dotnet",
			"format",
			"--verify-no-changes",
			"--no-restore",
		]),
		direct("test", ["dotnet", "test", "--no-build", "--nologo", "-v", "quiet"]),
		direct("build", ["dotnet", "build", "--nologo", "-v", "quiet"]),
	],
};
