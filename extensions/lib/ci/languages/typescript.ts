import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const TYPESCRIPT_BUN: LanguageProfile = {
	id: "typescript-bun",
	markers: ["bun.lock", "bun.lockb"],
	checks: [
		direct("typecheck", ["bun", "x", "tsc", "--noEmit"]),
		direct("lint", ["bun", "x", "biome", "check", "--reporter=summary"]),
		direct("format", ["bun", "x", "biome", "format", "--reporter=summary"]),
		direct("test", ["bun", "test"]),
		direct("build", ["bun", "x", "tsc", "--noEmit", "--pretty"]),
	],
};

export const NODE_PNPM: LanguageProfile = {
	id: "node-pnpm",
	markers: ["pnpm-lock.yaml"],
	checks: [
		direct("typecheck", ["pnpm", "exec", "tsc", "--noEmit"]),
		direct("lint", ["pnpm", "exec", "biome", "check", "--reporter=summary"]),
		direct("format", ["pnpm", "exec", "biome", "format", "--reporter=summary"]),
		direct("test", ["pnpm", "test"]),
		direct("build", ["pnpm", "run", "build"]),
	],
};

export const NODE_NPM: LanguageProfile = {
	id: "node-npm",
	markers: ["package-lock.json"],
	checks: [
		direct("typecheck", ["npx", "--no-install", "tsc", "--noEmit"]),
		direct("lint", [
			"npx",
			"--no-install",
			"biome",
			"check",
			"--reporter=summary",
		]),
		direct("format", [
			"npx",
			"--no-install",
			"biome",
			"format",
			"--reporter=summary",
		]),
		direct("test", ["npm", "test", "--silent"]),
		direct("build", ["npm", "run", "build", "--silent"]),
	],
};

export const NODE_YARN: LanguageProfile = {
	id: "node-yarn",
	markers: ["yarn.lock"],
	checks: [
		direct("typecheck", ["yarn", "exec", "--silent", "tsc", "--noEmit"]),
		direct("lint", [
			"yarn",
			"exec",
			"--silent",
			"biome",
			"check",
			"--reporter=summary",
		]),
		direct("format", [
			"yarn",
			"exec",
			"--silent",
			"biome",
			"format",
			"--reporter=summary",
		]),
		direct("test", ["yarn", "test", "--silent"]),
		direct("build", ["yarn", "build"]),
	],
};

export const DENO: LanguageProfile = {
	id: "deno",
	markers: ["deno.json", "deno.jsonc", "deno.lock"],
	checks: [
		direct("typecheck", ["deno", "check", "**/*.ts"]),
		direct("lint", ["deno", "lint"]),
		direct("format", ["deno", "fmt", "--check"]),
		direct("test", ["deno", "test", "--quiet"]),
	],
};
