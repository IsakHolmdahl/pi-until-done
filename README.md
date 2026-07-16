# pi-until-done

![pi-until-done preview](./assets/preview.png)

A Pi extension that brings [Hermes Agent's `/goal`](https://hermes-agent.nousresearch.com/docs/user-guide/features/goals)
("the Ralph loop with a judge") to Pi as `/until-done`. Every
`until_done_complete` is gated by a cross-model LLM judge by default —
the standard fix for Ralph-loop oscillation, where the executor talks
itself into a premature "done." Pick a different model than the executor
at setup time (`judgeModel: { provider, modelId }`) and the judge LLM
has to independently agree before the goal transitions to `done`. If
you have no second model available, opt into same-model self-judge with
`sameModelJudge: true` — `until_done_set` refuses without one of those
two.

The extension also runs CI automatically after every turn that made
code edits (typecheck + lint + format + test + build, based on your
project's language profile) and blocks the goal on failure so Pi
can't silently accumulate broken builds.

[![npm version](https://img.shields.io/npm/v/pi-until-done.svg?logo=npm&logoColor=white)](https://www.npmjs.com/package/pi-until-done)
[![types: TypeScript](https://img.shields.io/npm/types/pi-until-done.svg)](https://www.npmjs.com/package/pi-until-done)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![pi-package](https://img.shields.io/badge/pi--package-pi.dev-7c3aed)](https://pi.dev/packages)
[![CI](https://github.com/srinitude/pi-until-done/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/srinitude/pi-until-done/actions/workflows/ci.yml?query=branch%3Amain)
[![Publish](https://github.com/srinitude/pi-until-done/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/srinitude/pi-until-done/actions/workflows/publish.yml)

> **Pi's own philosophy**: _minimal core, extensible edges, deterministic,
> inspectable, preserve developer agency._ This extension composes; it
> does not override. State lives in session entries. Every completion is
> judged — cross-model by default. No system-prompt replacement, no
> side database, no hidden state, no silent path past the judge.

---

## Install

The package is on npm: <https://www.npmjs.com/package/pi-until-done>.

### Through Pi (recommended)

```bash
pi install npm:pi-until-done                              # from npm
pi install github:srinitude/pi-until-done                 # from git
pi install /path/to/pi-until-done                         # local install
pi -e /path/to/pi-until-done/extensions/until-done.ts     # try without installing
```

The package manifest declares all four pi.dev resource types
(`pi.extensions`, `pi.skills`, `pi.prompts`, `pi.image`), so a single
`pi install` wires up everything.

### Directly via your package manager

```bash
bun add pi-until-done
npm install pi-until-done
pnpm add pi-until-done
yarn add pi-until-done
deno add npm:pi-until-done
```

The runtime entrypoint is `extensions/until-done.ts`.

### Requirements

- Pi >= 0.x (`pi --version`)
- [Bun](https://bun.sh) >= 1.2

---

## Quick start

```text
/until-done finish migrating auth tests to Vitest
```

1. **PHASE 0 — brainstorm.** Pi refines the goal type (`ticket` vs.
   `exploratory`), inventories accessible **surfaces** (logs, metrics,
   staging URLs, sandboxes), and settles on a `verifyCommand`. Vague
   goals get tightened here; sharp goals move faster.

2. **Contract draft.** Pi drafts the North Star — `goal`, `doneCriteria`,
   `verifyCommand`, `askBefore`, `decisionStyle`, `goalType`, `surfaces`,
   `startPhase`, and the **judge mode** (cross-model or same-model) —
   and shows it to you for review.

3. **`until_done_set`.** Locks the contract and moves the goal to
   `planning` status.

4. **Plan + approval.** Pi drafts the TDD-first task list and calls
   `until_done_plan`. The extension opens the approval dialog (or
   plannotator if installed). On approval, the goal moves to `active`.
   On rejection, the North Star is preserved and Pi revises the plan.

5. **Pursuit loop.** Pi works in TDD-first mode:
   `ANALYSIS → BOOTSTRAP → RED → GREEN → REFACTOR → CLEANUP`.
   After every turn that wrote or edited code, the extension runs CI
   automatically (typecheck + lint + format + test + build) and blocks
   on failure. Phase transitions go through `until_done_progress`.

6. **Completion gate.** Pi calls `until_done_complete` with quoted
   `verifyCommand` output as evidence. The LLM judge evaluates the
   claim independently — only a `done` verdict lets the goal through.
   On `continue`, Pi must address the gap and try again.

7. **Distill.** After the goal is done, Pi calls `until_done_distill`
   to compile the journey into `.until-done/distilled.md`.

8. **Budget.** Default 20 turns. When exhausted, the loop pauses and
   tells you exactly how to resume with `/until-done resume`.

Anything you type at any point preempts the loop. For a non-preempting
side question use `/until-done ask <question>`.

---

## Status line

The footer shows the live phase glyph while a goal is active:

| Glyph | Phase |
| --- | --- |
| `◷ analysis` | Reading code, scoping the problem |
| `⚙ bootstrap` | Validating CI infra |
| `✗ red` | Failing test exists |
| `✓ green` | Test passes |
| `↺ refactor` | Improving structure without changing behavior |
| `⌫ cleanup` | Stripping debug prints / scratch files |
| `· none` | Research or doc goal |

---

## Subcommands

| Command | Purpose |
| --- | --- |
| `/until-done <intent>` | Start setup for a new goal |
| `/until-done status` | One-line current state |
| `/until-done detail` | Full contract overlay (TUI) |
| `/until-done tasks` | Print the live task list |
| `/until-done plan` | Show `.until-done/tasks.yaml` path |
| `/until-done northstar` | Print the locked goal contract |
| `/until-done replan-log` | Audit log of every replan + reason |
| `/until-done pause` | Halt continuation, keep state |
| `/until-done resume` | Resume + reset budget |
| `/until-done unblock` | Clear a blocked goal (user-side) |
| `/until-done cancel` | Clear the goal entirely |
| `/until-done budget <n>` | Change turn budget (1..20000; >500 prompts confirm) |
| `/until-done ask <question>` | Side question — does **not** preempt the loop |
| `/until-done autopilot` | Toggle skipping the contract dialog on future setups |
| `/until-done judge` | Show the session-default judge mode |
| `/until-done judge <provider>/<modelId>` | Set a cross-model judge default |
| `/until-done judge same` | Set same-model self-judge as the session default |
| `/until-done judge clear` | Unset the session default |
| `/until-done help` | Show this list |

Plus: `--until-done "<intent>"` CLI flag and `Ctrl+Shift+G` shortcut to
redraw the contract widget.

---

## Tools (9)

| Tool | Purpose |
| --- | --- |
| `until_done_set` | Lock the North Star contract after user approval |
| `until_done_plan` | Submit the TDD-first task list (once after `set`) |
| `until_done_replan` | Mid-execution restructuring — insert / remove / replace / split / merge / reorder |
| `until_done_task_update` | Patch a single task — status, learnings, gotchas, context |
| `until_done_progress` | Record a one-line progress note + optional phase transition |
| `until_done_complete` | Declare done — requires quoted `verifyCommand` output; gated by LLM judge |
| `until_done_block` | Pause with a question for the user |
| `until_done_unblock` | Clear a block programmatically (counterpart to `until_done_block`) |
| `until_done_distill` | After done: compile the journey into `.until-done/distilled.md` |

---

## Cross-model judge (default-on, required)

`until_done_set` requires you to pick a judge mode up front:

- **Cross-model (recommended):** set `judgeModel: { provider, modelId }` to a
  model **different** from the executor. The judge sees only the goal,
  done-criteria, verifyCommand, and the executor's cited evidence — no
  executor history to bias it. Cross-vendor pairs (Anthropic + OpenAI) or
  same-family different-size pairs (Sonnet executor / Opus judge) both work.

- **Same-model self-judge:** set `sameModelJudge: true`. The active executor
  model judges with a fresh, completion-focused context. Strictly weaker than
  cross-model — use only when no second model is available.

- **Neither set:** `until_done_set` refuses with `judge_unspecified`. There is
  no silent path past the judge.

The `/until-done judge` command lets you pre-configure a session-level default
so Pi doesn't have to specify on every goal. Per-goal `until_done_set`
arguments always win over the session default.

**Verdict semantics:**

- `done` → executor's claim approved; goal transitions to `done`; judge's
  reason appended as evidence.
- `continue` → completion refused; reason appended; loop stays `active` and
  Pi must address the specific gap with stronger evidence.
- `parse_error` / `unavailable` → fail-open with a warning evidence line so
  judge-infra glitches don't block legitimate completion.

---

## Automatic CI on every turn with code edits

After each turn where Pi wrote or edited at least one file, the extension
automatically runs discovered CI checks (typecheck, lint, format, compile,
test, build) via `Bun.spawn`, threaded to `ctx.signal` so `Esc` aborts
in-flight runs. If any check fails, the goal transitions to `blocked` and Pi
receives a failure summary as a follow-up.

**Detected language profiles (25):** TypeScript/Bun, TypeScript/pnpm,
TypeScript/npm, TypeScript/yarn, Deno, Python, Python-uv, Go, Rust, Ruby,
Java/Gradle, Java/Maven, Kotlin/Gradle, Kotlin/Maven, Swift, C++/CMake,
C++/Make, C++/Meson, .NET, Elixir, Erlang, Zig, Lua, Luau, Roblox.

Multiple profiles active at once (e.g. Kotlin Gradle + Java Gradle) resolve
to one check per CI verb (first match wins), so you never double-run a step.

---

## North Star + dynamic task list

The contract separates what is **locked** from what is **mutable**:

| | Locked at `until_done_set` | Mutable mid-execution |
| --- | --- | --- |
| `goal` | ✓ | ✗ |
| `doneCriteria` | ✓ | ✗ |
| `verifyCommand` | ✓ | ✗ |
| `askBefore` | ✓ | ✗ |
| `judgeModel` / `sameModelJudge` | ✓ | ✗ |
| Task list (insert/remove/split/merge/reorder/replace) | ✗ | via `until_done_replan` |
| Per-task validationSteps, ciCommands, guardrails | ✗ | via `until_done_task_update` |
| Per-task status, learnings, gotchas, context refs | ✗ | via `until_done_task_update` |
| `phase` | ✗ | via `until_done_progress` |
| `maxTurns` | ✗ | via `/until-done budget <n>` |

The only way to change the North Star is `/until-done cancel` followed by a
new setup — requiring fresh user approval by design.

### Replan operations

| Op | When to use |
| --- | --- |
| `insert` | A new sub-task surfaced during execution |
| `remove` | A planned task is moot (must be `pending` or `blocked`; `done` is immutable) |
| `replace` | A pending task was specced wrong |
| `split` | One task is actually 2+ tasks |
| `merge` | Two tasks collapse into one |
| `reorder` | Dependencies need adjusting |

Every replan requires a non-empty `reason` which is appended to affected
tasks' learnings and to `/until-done replan-log`. The whole batch validates
atomically — if one op is illegal, none apply. Cycles are rejected.

### Live YAML on disk

After `until_done_plan` and every `until_done_task_update` /
`until_done_replan`, the extension rewrites `.until-done/tasks.yaml` in the
project root so you can read the current state without opening the TUI:

```yaml
generated: 2026-05-04T12:34:56.000Z
goalId: ud-abc123
goal: finish migrating auth tests to Vitest
doneCriteria: bun test exits 0 with all auth specs green
verifyCommand: bun test
phase: green
askBefore: [git push]
budget: { used: 7, max: 20 }
currentTaskId: T-005
tasks:
  - id: T-001
    title: Bootstrap Vitest config
    phase: bootstrap
    status: done
    dependencies: []
    blocks: [T-002]
    prerequisites: []
    validationSteps:
      - cat vitest.config.ts
      - bun test --version
    ciCommands: [bun test]
    styleguideRules: []
    guardrails: ["no new top-level deps without confirmation"]
    learnings: ["replan: discovered tsconfig conflict"]
    gotchas: ["forgot to update tsconfig include"]
    context:
      - path: package.json
        why: read existing test script
  - ...
```

### Clean-end guarantee

When every planned task is `done` or `skipped` but Pi hasn't called
`until_done_complete`, the extension sends a structured reminder:

> All planned tasks are marked done. Two paths:
> 1. Run `<verifyCommand>`. If it passes, call `until_done_complete`.
> 2. If residual work surfaced, call `until_done_replan` with reason
>    `residual_work_discovered`. Do not invent work outside the plan.

After two such nudges without completion, the loop pauses and yields to you.
The turn budget is the absolute backstop.

---

## Per-turn system-prompt injection

Every turn, `before_agent_start` **appends** (never replaces) a composite
reminder block. Sources in injection order:

1. **North Star** — goal, goalType, doneCriteria, verifyCommand, askBefore,
   surfaces, current phase, budget line, task progress line.
2. **TDD discipline** — `RED → GREEN → REFACTOR → CLEANUP`.
3. **Verifiability discipline** — quote command output; treat uncertainty as
   not achieved; no proxy signals.
4. **Structural constraints** — nesting ≤ 3, construct ≤ 30 LOC, single responsibility. Applied to every language Pi generates.
5. **Plan management + tool flow** — when to call `until_done_replan`,
   `until_done_task_update`, `until_done_complete`, `until_done_block`.

---

## Pi primitive coverage

### Hook events (28 subscribed; 1 declarative)

| Event | Mode | Why |
| --- | --- | --- |
| `resources_discover` | declarative | Skills + prompts paths declared via `package.json#pi.skills/prompts` |
| `session_start` | active | Reconstruct state; honor `--until-done` flag; warn if `@qhn/pi-goal` installed |
| `session_before_switch` | active | Confirm before leaving an active goal |
| `session_before_fork` | active | Three-way choice: carry / leave / cancel |
| `session_before_compact` | not subscribed | `SessionBeforeCompactResult` has no `customInstructions` slot Pi reads from hooks |
| `session_compact` | active | Emit `verdict` re-anchor + `CustomMessageEntry` with recent evidence, learnings, current task |
| `session_before_tree` | observed | Pi handles snapshotting |
| `session_tree` | active | Full state reconstruction from new branch |
| `session_shutdown` | active | Clear status + widget keys |
| `context` | **no-op** | Pi philosophy: don't mutate LLM messages |
| `before_provider_request` | observed | Telemetry counter |
| `after_provider_response` | observed | Telemetry counter |
| `before_agent_start` | active | Append goal reminder block to system prompt |
| `agent_start` | active | Reset per-turn counters; set working-message |
| `agent_end` | active | Budget check → spin guard → CI on stop → clean-end nudge → continuation |
| `turn_start` | active | Refresh status line |
| `turn_end` | active | Capture assistant text snapshot |
| `message_start` | observed | Reserved |
| `message_update` | observed | Live status (rate-limited 500 ms) |
| `message_end` | active | Capture finalized assistant text |
| `tool_execution_start` | observed | Tool-start counter |
| `tool_execution_update` | observed | Pi handles streaming UI |
| `tool_execution_end` | observed | Tool-end counter |
| `model_select` | observed | Telemetry counter |
| `thinking_level_select` | observed | Telemetry counter |
| `tool_call` | active | **POLICY GATE**: enforce ask-before list on `bash`; score progress signals per built-in tool |
| `tool_result` | observed | Reserved |
| `user_bash` | observed | Counter only |
| `input` | active | Mark `userMessagedThisTurn = true` for interactive-source input only |

### Built-in tool progress scoring

| Tool | Score | Reason |
| --- | --- | --- |
| `edit` | +3 | Strong progress — real change |
| `write` | +3 | Strong progress — real change |
| `bash` | +2 | Progress + ask-before policy gate |
| `read` | +1 | Investigation |
| `grep` | +1 | Search |
| `find` | +1 | Search |
| `ls` | +1 | Search |

If `progressSignalsThisTurn === 0` at `agent_end`, the goal transitions to
**blocked** with reason `"spin guard"` — the model did nothing useful that
turn.

### Other Pi primitives

| Primitive | Usage |
| --- | --- |
| `pi.registerCommand` | `/until-done` with subcommand autocomplete |
| `pi.registerTool` | All 9 tools |
| `pi.registerFlag` | `--until-done <text>` |
| `pi.registerShortcut` | `Ctrl+Shift+G` — redraw contract widget |
| `pi.appendEntry` | Persists `until-done.state` events |
| `pi.sendUserMessage` | Continuation prompts + setup interview |
| `pi.sendMessage` | Re-anchors goal context as `CustomMessageEntry` after compaction (`display: false`) |
| `pi.getCommands` | Detects `@qhn/pi-goal` collisions |
| `pi.getFlag` | Reads `--until-done` value |
| `pi.events` | Plannotator bridge (`plannotator:request` / `plannotator:review-result`) |
| `ctx.ui.confirm/select/input/editor` | Setup confirmation, fork choice, ask-before, cancel |
| `ctx.ui.notify` | Status messages |
| `ctx.ui.setStatus` | Footer status line |
| `ctx.ui.setWidget` | Above-editor contract widget |
| `ctx.ui.setTitle` | Terminal title during pursuit |
| `ctx.ui.setWorkingMessage` | "pursuing: …" during streaming |
| `ctx.ui.custom` | Full contract overlay (`/until-done detail`) |
| `ctx.ui.theme.fg` | All UI color uses theme tokens |
| `ctx.sessionManager.getBranch` | State reconstruction from JSONL entries |
| `ctx.waitForIdle` | Setup flow waits for the assistant before opening confirm |
| `ctx.signal` | Threaded into CI subprocesses and judge LLM calls |
| `ctx.modelRegistry` | Resolves judge model + auth (API key + headers) |
| `pi-ai`'s `complete()` | One-shot LLM call for the judge — kept outside the session |
| Skills (`skills/until-done/SKILL.md`) | Loaded on demand to teach Pi the contract + tool protocol |

> **Not used (intentional):** `pi.registerProvider`/`unregisterProvider`
> (production code; test harness only), `pi.setActiveTools` (would silently
> disable user tools), `ctx.compact`/`fork`/`navigateTree`/`switchSession`/
> `newSession` (user-initiated only), `pi.exec` (CI runs through `Bun.spawn`
> to thread `ctx.signal`), `pi.setSessionName`/`setLabel`/`setModel`/
> `setThinkingLevel`, and most editor-mutating `ctx.ui.*` primitives.

---

## TDD-first discipline

`/until-done` enforces these disciplines end-to-end:

- **Phases are explicit and tracked.** Pi declares the phase via
  `until_done_progress` and the extension renders it live.
- **No GREEN without RED.** A failing test is required before any production
  change for code-shipping goals.
- **Done = verifyCommand passes.** `until_done_complete` requires `evidence`
  quoting the command output. Speculative completion is refused.
- **CI runs automatically.** Any turn that writes or edits code triggers a
  full CI run; failure blocks the goal immediately.
- **No claims about unverified state.** The skill bans pretending tests,
  guarantees, or context exist when they haven't been verified.
- **Structural constraints.** Nesting ≤ 3, construct ≤ 30 LOC, single responsibility per construct — in every language.

---

## Comparison with `@qhn/pi-goal` and Hermes `/goal`

| | `@qhn/pi-goal` | Hermes `/goal` | `/until-done` |
| --- | --- | --- | --- |
| Setup flow | User-led interview | None — judge asks each turn | Pi-led interview |
| Judge | None | Auxiliary model judge | Cross-model by default (required); opt-in same-model |
| Auto CI | No | No | Yes — runs on every turn with code edits |
| State storage | Pi session entries | SessionDB.state_meta | Pi session entries |
| Hook coverage | 1–2 events | n/a (Hermes-internal) | 28/29 events |
| Conflict-safe | yes | n/a | yes (detects `@qhn/pi-goal` at startup) |
| System-prompt mutation | none | none | append-only |

If both `@qhn/pi-goal` and `pi-until-done` are installed, you see a one-time
notice at `session_start` and can use whichever you prefer. Tool/command/event
keys are namespaced `until-done.*` / `until_done_*` to avoid collisions.

---

## Edge cases handled

1. **Extension loaded mid-session** → state reconstructs from existing entries; if none, no-op.
2. **Compaction during a goal** → `session_compact` emits a `CustomMessageEntry` with goal headline, verifyCommand, current task, recent evidence and learnings so the next turn retains them past the summary.
3. **Fork during a goal** → three-way `select` dialog: carry / leave / cancel.
4. **Switch session during a goal** → confirm dialog.
5. **Branch via `/tree`** → full state rebuilt from the new branch.
6. **User interjects mid-loop** → `input` hook flags `userMessagedThisTurn`; `agent_end` skips auto-continuation for that turn. Flag resets in `agent_end` after consumption (not in `agent_start` — would race with the input hook).
7. **Model produces no tools/text** → spin guard blocks with `"spin guard"` reason.
8. **Turn budget exhausted** → auto-pause with `/until-done resume` instructions.
9. **Pi calls `until_done_complete` falsely** → user can `/until-done resume` to challenge; new evidence required.
10. **Goal already exists during setup** → `select` dialog: replace / keep / cancel.
11. **RPC / print mode (no UI)** → `ctx.hasUI` guards degrade gracefully; `setWidget` skipped; `notify` still fires; detail overlay falls back to JSON dump.
12. **Provider/model switch mid-goal** → no re-binding; judge resolves through registry at completion time.
13. **Compaction over contract** → contract is among the first entries on the branch; reconstruction walks from root.
14. **`--until-done` flag at startup** → triggers `/until-done <text>` via `sendUserMessage` exactly once.
15. **`@qhn/pi-goal` also installed** → coexistence notice; commands don't collide (`/goal` vs. `/until-done`).
16. **Ask-before timeout (no human at terminal)** → 30 s timeout on `confirm`; on dismiss, the tool call is blocked with `user denied`.
17. **Hard ceiling 20000 turns** → `cmdBudget` rejects values above that; values above 500 prompt a confirm dialog.
18. **Goal cancelled mid-streaming** → transitions to `cleared`; next `agent_end` short-circuits via `status !== "active"` guard.
19. **Approval dialog times out** → resolves false; goal cleared.
20. **Multiple goals attempted** → `until_done_set` refuses with `goal_exists`.
21. **Tool called before approval** → `until_done_set` refuses with `not_confirmed`.
22. **CI abort on user Esc** → `ctx.signal` is threaded into `Bun.spawn`; user `Esc` kills the CI subprocess and its entire descendant tree (using a process group on Unix).
23. **Plannotator installed** → `until_done_plan` routes through the `plannotator:request` event channel for approval instead of the built-in confirm dialog.

---

## Verifying

```bash
cd pi-until-done
bun install
bun run check              # fast: typecheck + lint
bun run ci                 # full: typecheck + lint + test + build
bun run release-ready      # release-readiness suite
```

The full suite finishes in under 5 seconds locally. Then try it live:

```bash
pi -e ./extensions/until-done.ts
/until-done finish migrating auth tests to Vitest
```

---

## Tests

Tests run against a **real Pi runtime** (`createAgentSessionRuntime` from
`@mariozechner/pi-coding-agent`) with deterministic LLM responses supplied by
`registerFauxProvider` from `@mariozechner/pi-ai`. No hand-rolled
`ExtensionAPI` mocks. Real fs (temp dirs), real subprocesses (`Bun.spawn`),
real `AbortSignal` abort propagation.

| Path | Covers |
| --- | --- |
| `tests/integration/harness-smoke.test.ts` | Runtime boots; extension binds; tools + command register |
| `tests/integration/goal-flow.test.ts` | Full E2E: setup → set → plan → progress → task_update → complete → distill |
| `tests/tools/lifecycle.test.ts` | `set/complete/block/unblock/progress` status guards + transitions |
| `tests/tools/judge.test.ts` | Cross-model judge: schema, approve, reject, malformed-JSON fail-open |
| `tests/tools/plan.test.ts` | `until_done_plan` dependency validation, `tasks.yaml` write |
| `tests/tools/replan.test.ts` | Cycle detection, done-immutability, replanLog growth |
| `tests/tools/task-update-distill.test.ts` | Task patches, cursor advancement, `distilled.md` write |
| `tests/commands/router.test.ts` | Subcommand dispatch — autopilot, budget disambiguation, setup |
| `tests/commands/setup.test.ts` | Contract dialog approve/reject, autopilot skip, replace/keep |
| `tests/commands/control.test.ts` | Pause/resume/cancel/budget/unblock — including resume-from-done |
| `tests/commands/info-ask.test.ts` | Status / detail / tasks / northstar / replan-log / ask |
| `tests/commands/judge.test.ts` | `/until-done judge` subcommand — cross/same/clear |
| `tests/hooks/agent-hooks.test.ts` | `agent_start/agent_end` — `userMessagedThisTurn` race fix, budget, CI gate |
| `tests/hooks/before-agent-start.test.ts` | System-prompt reminder — augments only when active, includes verifyCommand |
| `tests/hooks/session-hooks.test.ts` | `session_start` reconstruction, `session_compact` re-anchor, `session_shutdown` |
| `tests/hooks/tools-hook.test.ts` | Ask-before — UI-on confirm, no-UI block, scoring, `until_done_*` exclusion |
| `tests/ci/discovery.test.ts` | `discoverChecks` with real-fs scenarios — Gradle disambiguation, Python-uv, Luau/Roblox |
| `tests/ci/runner.test.ts` | `runOne` against real subprocesses — exit codes, timeout, AbortSignal, output truncation |
| `tests/profiles/{bun,pnpm,npm,yarn,deno}.test.ts` | Each TypeScript runtime profile shape |
| `tests/platform/os.test.ts` | macOS/Linux/Windows path + line-ending neutrality |
| `tests/platform/discovery.test.ts` | All profiles use POSIX-style markers; all checks are direct commands |
| `tests/build-smoke.ts` | Runtime entrypoint resolves on every supported OS |

Run with `bun run test`. Full suite (`bun run ci`) finishes in under 5
seconds locally.

---

## Cross-platform CI

The GitHub workflow runs the full suite on **macos-latest**,
**ubuntu-latest**, and **windows-latest** in parallel.

### Upstream Pi watcher (auto-merge gated on CI + CodeRabbit)

Two workflows keep this extension current with upstream pi-mono with no manual
ceremony when the upgrade is clean — and **zero auto-merges when it's not**:

1. **`upstream-watch.yml`** (daily 06:13 UTC + manual dispatch) — checks npm
   for new releases of `@mariozechner/pi-coding-agent` and
   `@mariozechner/pi-ai`, bumps `bun.lock`, runs `bun run ci` in-workflow,
   and opens/updates a PR (`upstream/pi-bump`) with `coderabbitai` requested
   as reviewer and the `auto-merge` label.

2. **`upstream-pi-merge-gate.yml`** — fires on every PR review submission and
   every CI workflow completion. Evaluates the PR's latest head SHA against
   two explicit gates:
   - **CI is green** — every required check on the head SHA reports `success`
     or `skipped`, and at least three checks have completed (the OS matrix).
   - **CodeRabbit approved** — the most recent review from `coderabbitai[bot]`
     is `APPROVED`.

   Only when **both** gates are green on the same SHA does the workflow call
   `gh pr merge --squash --delete-branch`.

Repo prerequisites:
1. **`UPSTREAM_PAT` repo secret** — a PAT with `repo` + `workflow` scope.
   Without it, PRs created by `upstream-watch.yml` use `GITHUB_TOKEN` and
   downstream workflows won't fire (GitHub's recursive-workflow safeguard).
2. **CodeRabbit installed** on the repo (<https://app.coderabbit.ai>).

---

## Security

`/until-done` is an autonomous-loop extension. By default it runs Pi's
built-in tools on the active model's behalf each turn.

- **Filesystem writes** are unrestricted unless you list commands in the
  contract's `askBefore[]`. Ask-before triggers a confirm dialog for any
  matching `bash` invocation. Examples: `git push`, `rm`, `terraform apply`.
- **Network calls** are whatever the model decides to make via `bash`. The
  extension itself makes no network calls.
- **Credentials** are never read or stored. State lives in Pi session entries
  (JSONL on your local disk).
- **CI commands** run through `Bun.spawn` (direct commands, no wrapper)
  against your project's detected language profile.
- **No system-prompt replacement** — the extension only *appends* via
  `before_agent_start`.
- **No background side effects** — no daemons, no hidden state, no uploads,
  no telemetry. Auditable in the JSONL session log.
- **Hard turn budget** ceiling of 20000; confirm above 500; default 20.
  Spin guard, clean-end nudge, CI failure, user input, and `/until-done pause`
  all preempt regardless of budget.

For vulnerability disclosure see [SECURITY.md](SECURITY.md).

---

## Contributing

This project is open source under MIT. Contributions welcome.

- Read [AGENTS.md](AGENTS.md) — the project's operating contract (this file's companion)
- Read [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, TDD flow, PR rules
- **No AI co-authorship trailers** in commits or PRs (project policy)
- See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards
- For security issues: [SECURITY.md](SECURITY.md) (do not file public issues)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

PR template: [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
Issue templates: [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/)

---

## Sources

- Hermes Agent goals doc: https://hermes-agent.nousresearch.com/docs/user-guide/features/goals
- Pi extension API: `packages/coding-agent/src/core/extensions/types.ts` in https://github.com/badlogic/pi-mono
- Pi extensions doc: https://pi.dev/docs/latest/extensions

License: MIT.
