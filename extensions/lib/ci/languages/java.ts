import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const JAVA_GRADLE: LanguageProfile = {
	id: "java-gradle",
	markers: ["build.gradle", "build.gradle.kts"],
	checks: [
		direct("compile", ["gradle", "--quiet", "compileJava"]),
		direct("build", ["gradle", "--quiet", "build", "-x", "test"]),
		direct("test", ["gradle", "--quiet", "test"]),
		direct("lint", ["gradle", "--quiet", "checkstyleMain"]),
	],
};

export const JAVA_MAVEN: LanguageProfile = {
	id: "java-maven",
	markers: ["pom.xml"],
	checks: [
		direct("compile", ["mvn", "-q", "compile"]),
		direct("build", ["mvn", "-q", "package", "-DskipTests"]),
		direct("test", ["mvn", "-q", "test"]),
		direct("lint", ["mvn", "-q", "checkstyle:check"]),
	],
};
