import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const GO: LanguageProfile = {
	id: "go",
	markers: ["go.mod"],
	checks: [
		direct("typecheck", ["go", "vet", "./..."]),
		direct("lint", ["golangci-lint", "run", "./..."]),
		direct("format", ["gofmt", "-l", "."]),
		direct("compile", ["go", "build", "-o", "/dev/null", "./..."]),
		direct("test", ["go", "test", "-count=1", "./..."]),
		direct("build", ["go", "build", "./..."]),
	],
};
