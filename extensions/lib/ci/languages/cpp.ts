import { direct } from "../factories";
import type { LanguageProfile } from "./types";

export const CPP_CMAKE: LanguageProfile = {
	id: "cpp-cmake",
	markers: ["CMakeLists.txt"],
	checks: [
		direct("build", ["cmake", "--build", "build"]),
		direct("test", ["ctest", "--test-dir", "build", "--output-on-failure"]),
		direct("format", ["clang-format", "--dry-run", "--Werror", "--style=file"]),
		direct("lint", ["clang-tidy", "--quiet"]),
	],
};

export const CPP_MAKE: LanguageProfile = {
	id: "cpp-make",
	markers: ["Makefile", "GNUmakefile"],
	checks: [direct("build", ["make"]), direct("test", ["make", "test"])],
};

export const CPP_MESON: LanguageProfile = {
	id: "cpp-meson",
	markers: ["meson.build"],
	checks: [
		direct("build", ["meson", "compile", "-C", "build"]),
		direct("test", ["meson", "test", "-C", "build"]),
	],
};
