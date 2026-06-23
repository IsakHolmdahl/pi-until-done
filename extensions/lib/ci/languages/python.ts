import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const PYTHON: LanguageProfile = {
	id: "python",
	markers: [
		"pyproject.toml",
		"setup.py",
		"setup.cfg",
		"Pipfile",
		"requirements.txt",
	],
	checks: [
		direct("typecheck", ["mypy", "--pretty", "."]),
		direct("lint", ["ruff", "check", "."]),
		direct("format", ["ruff", "format", "--check", "."]),
		direct("test", ["pytest", "-q"]),
	],
};

export const PYTHON_UV: LanguageProfile = {
	id: "python-uv",
	markers: ["uv.lock"],
	checks: [
		direct("typecheck", ["uv", "run", "mypy", "."]),
		direct("lint", ["uv", "run", "ruff", "check", "."]),
		direct("format", ["uv", "run", "ruff", "format", "--check", "."]),
		direct("test", ["uv", "run", "pytest", "-q"]),
	],
};
