import type { Phase } from "../types";

const GLYPHS: Record<Phase, string> = {
	analysis: "◷",
	bootstrap: "⚙",
	red: "✗",
	green: "✓",
	refactor: "↺",
	cleanup: "⌫",
	manual_test: "🧪",
	none: "·",
};

export const phaseGlyph = (p: Phase): string => GLYPHS[p];
