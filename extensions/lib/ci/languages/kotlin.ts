import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const KOTLIN_GRADLE: LanguageProfile = {
	id: "kotlin-gradle",
	markers: [
		"build.gradle.kts",
		"build.gradle",
		"settings.gradle.kts",
		"settings.gradle",
	],
	markerContentPattern:
		/kotlin\(\s*["']jvm["']\s*\)|apply\s+plugin:\s*["']kotlin|org\.jetbrains\.kotlin/i,
	checks: [
		direct("compile", ["gradle", "--quiet", "compileKotlin"]),
		direct("build", ["gradle", "--quiet", "assemble"]),
		direct("test", ["gradle", "--quiet", "test"]),
		direct("lint", ["gradle", "--quiet", "detekt"]),
		direct("format", ["ktlint", "--reporter=plain", "--relative"]),
	],
};

export const KOTLIN_MAVEN: LanguageProfile = {
	id: "kotlin-maven",
	markers: ["pom.xml"],
	markerContentPattern: /kotlin-maven-plugin|kotlin-stdlib/i,
	checks: [
		direct("compile", ["mvn", "-q", "compile"]),
		direct("build", ["mvn", "-q", "package", "-DskipTests"]),
		direct("test", ["mvn", "-q", "test"]),
		direct("lint", ["mvn", "-q", "antrun:run@ktlint"]),
	],
};
