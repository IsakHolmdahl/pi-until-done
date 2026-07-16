# AGENTS.md — pi-until-done operating contract

This file is the authoritative working contract for any AI agent (Pi, Claude,
GPT, Gemini, or any other model) editing this codebase. Read it fully before
touching code. It is enforced by `before_agent_start` every turn when a goal
is active.

---

## Project summary

`pi-until-done` is a Pi extension that brings the Ralph loop (Hermes Agent's
`/goal`) to Pi as `/until-done`. It uses every relevant Pi extension primitive,
defers every judgment to the active LLM, and enforces a cross-model judge gate
on every `until_done_complete`. State lives in Pi session entries (JSONL). No
side database, no system-prompt replacement, no silent paths past the judge.

Entry point: `extensions/until-done.ts` — thin composition root.
Implementation: `extensions/lib/**` — each construct ≤ 30 LOC, nesting ≤ 3.

---

## TDD-first execution (mandatory for code-shipping goals)

All phases apply to this codebase too.

| Phase | What it means |
| --- | --- |
| **ANALYSIS** | Read, understand scope. No production edits. |
| **BOOTSTRAP** | Verify CI infra (`bun run ci`) is green before changes. |
| **RED** | Write a failing test. Run it. Confirm it fails. |
| **GREEN** | Minimal production change to pass. |
| **REFACTOR** | Improve structure, readability, performance without changing behavior. Run verify after. |
| **CLEANUP** | Strip debug prints, scratch files, temporary stubs before declaring done. |
| `none` | Research / doc goal — no production code. |

**No GREEN without RED.** Never write production code without a prior failing
test for code-shipping goals. The SKILL.md enforces this; this file repeats it.

---

## Structural constraints (HARD — all languages)

These limits apply to every file you write or edit, in every language:

- Nesting depth ≤ 3 (if / for / while / try / match / with / nested fn / lambda)
- Each construct (function / method / class / module / block) ≤ 30 LOC
- Single responsibility per construct — extract helpers when in doubt
- If a change would push a construct past these limits, split it

The extension itself follows these limits. Every file in `extensions/lib/`
enforces them. Your changes must too.


---

## Development workflow

```bash
bun install                # install deps
bun run check              # fast: typecheck + lint
bun run ci                 # full: typecheck + lint + test + build
bun run release-ready      # release-readiness suite
bun run test               # test suite only
```

Scripts are defined in `package.json`. All project tooling goes through
`bun run <script>`.

---

## Architecture overview

```
extensions/
  until-done.ts            # composition root — thin, no logic
  lib/
    types.ts               # GoalState, Task, NorthStar, StateEvent, etc.
    store.ts               # in-memory store + persist() + reconstructFromSession()
    constants.ts           # budget ceilings, timing constants, key names
    initial-state.ts       # default GoalState + Stats
    structural-constraints.ts  # shared constraint block (injected every turn)
    continuation.ts        # continuation message builder
    plannotator.ts         # plannotator bridge (plan approval via events)
    cycle.ts               # goal-id + task-id generation
    flag.ts                # --until-done CLI flag
    shortcut.ts            # Ctrl+Shift+G shortcut
    yaml-writer.ts         # .until-done/tasks.yaml writer
    commands/
      router.ts            # /until-done subcommand dispatcher + autocomplete
      setup.ts             # /until-done <intent> setup flow
      setup-prompt.ts      # setup meta-prompt builder
      control.ts           # pause / resume / cancel / budget / autopilot / unblock
      info.ts              # status / detail / tasks / plan / northstar / replan-log
      ask.ts               # /until-done ask <question>
      judge.ts             # /until-done judge management
    hooks/
      index.ts             # registers all hooks
      session.ts           # session_start/compact/tree/before-switch/before-fork/shutdown
      agent.ts             # before_agent_start / agent_start / agent_end
      agent-end-ci.ts      # CI auto-run on agent_end when code edits exist
      agent-end-helpers.ts # budget exhausted / spin guard / clean-end / continuation
      before-agent-start.ts # system-prompt reminder (append-only)
      turn.ts              # turn_start/end + message_start/update/end
      tools.ts             # tool_call gate + progress scoring
      input.ts             # input hook — userMessagedThisTurn flag
      telemetry.ts         # before_provider_request + model/thinking counters
      compaction-context.ts# annotation emitted on session_compact
    tools/
      index.ts             # registerTools()
      lifecycle.ts         # until_done_set / complete / block / unblock / progress
      complete.ts          # executeComplete() + judge dispatch
      judge.ts             # consultJudge() / consultSelfJudge()
      plan.ts              # until_done_plan
      replan.ts            # until_done_replan
      replan-apply.ts      # apply replan ops atomically
      replan-ops.ts        # insert / remove / replace / split / merge / reorder
      task-update.ts       # until_done_task_update
      task-update-apply.ts # apply task patch + advance currentTaskId
      distill.ts           # until_done_distill → .until-done/distilled.md
      result.ts            # ok() / refused() / failed() builders
    schemas/
      lifecycle.ts         # SetParams / CompleteParams / BlockParams / ...
      set-fields.ts        # NorthStar-related schema fields
      task.ts              # Task schema
      task-fields.ts       # task patch fields
      task-update.ts       # TaskUpdateParams
      literals.ts          # Phase / GoalType / CiVerb literals
      distill.ts           # DistillParams
    strings/
      index.ts             # re-exports all string modules
      notify.ts            # NOTIFY.* user-facing notification strings
      refusals.ts          # REFUSAL.* tool refusal strings
      dialogs.ts           # DIALOGS.* confirm/select dialog strings
      help.ts              # HELP_TEXT
      tools.ts             # TOOL_DESCRIPTIONS / TOOL_LABELS / TOOL_RESULTS
    ci/
      index.ts             # runCi() + renderHeadline() + renderFailureBlock()
      discover.ts          # discoverChecks() — language-profile detection
      runner.ts            # runOne() — Bun.spawn with signal + truncation
      summarize.ts         # CiSummary builder
      types.ts             # CiCheck / CiResult / CiSummary / CiVerb
      constants.ts         # output truncation limits
      factories.ts         # check factories
      languages/
        index.ts           # LANGUAGE_PROFILES export
        types.ts           # LanguageProfile interface
        typescript.ts      # bun / pnpm / npm / yarn / deno
        python.ts          # python + python-uv
        go.ts              # go
        rust.ts            # rust
        ruby.ts            # ruby
        java.ts            # java (gradle + maven)
        kotlin.ts          # kotlin (gradle + maven)
        swift.ts           # swift
        cpp.ts             # c++ (cmake / make / meson)
        dotnet.ts          # .net
        elixir.ts          # elixir + erlang
        lua.ts             # lua
        luau.ts            # luau + roblox
        zig.ts             # zig
    ui/
      status-line.ts       # setStatus() / statusLine() — footer status
      widget.ts            # setWidget() — above-editor contract widget
      contract-overlay.ts  # ctx.ui.custom full-screen overlay (TUI)
      overlay-rows.ts      # row builders for ContractOverlay
      phase-glyph.ts       # phase → glyph mapping
skills/
  until-done/SKILL.md      # on-demand skill loaded when a goal is active
tests/
  helpers/
    runtime-harness.ts     # createAgentSessionRuntime + faux provider wiring
    runtime-config.ts      # test runtime config builder
    factories.ts           # goal-state / task factories
    ui-mock.ts             # ui mock helpers
    _helpers.ts            # shared tool-test utilities
  integration/
    harness-smoke.test.ts  # runtime boots; extension binds; tools + command register
    goal-flow.test.ts      # full E2E: setup → set → plan → progress → complete → distill
  tools/
    lifecycle.test.ts      # set/complete/block/unblock/progress guards + transitions
    judge.test.ts          # cross-model judge: schema, approve, reject, fail-open
    plan.test.ts           # until_done_plan dependency validation + tasks.yaml write
    replan.test.ts         # cycle detection, done-immutability, replanLog growth
    task-update-distill.test.ts  # task patches, cursor advance, distilled.md write
  commands/
    router.test.ts         # subcommand dispatch + disambiguation
    setup.test.ts          # contract dialog approve/reject, autopilot, replace/keep
    control.test.ts        # pause/resume/cancel/budget/unblock
    info-ask.test.ts       # status/detail/tasks/northstar/replan-log/ask
    judge.test.ts          # /until-done judge subcommand
  hooks/
    agent-hooks.test.ts    # agent_start/agent_end — race fix, budget, CI gate
    before-agent-start.test.ts  # system-prompt reminder block
    session-hooks.test.ts  # session_start, session_compact, session_shutdown
    tools-hook.test.ts     # tool_call ask-before + scoring
  ci/
    discovery.test.ts      # discoverChecks real-fs scenarios
    runner.test.ts         # runOne real subprocesses + signal abort
  profiles/
    bun.test.ts / npm.test.ts / pnpm.test.ts / yarn.test.ts / deno.test.ts
  platform/
    os.test.ts             # macOS/Linux/Windows path + line-ending neutrality
    discovery.test.ts      # POSIX-style markers; all checks are direct commands
  build-smoke.ts           # runtime entrypoint resolves on every supported OS
```

---

## Pi primitive usage rules

### Hooks — compose, never replace

- `before_agent_start`: **append** to `event.systemPrompt`. Never replace it.
  Return `undefined` when the goal is not active.
- `session_before_compact`: never subscribed — the `SessionBeforeCompactResult`
  type has no `customInstructions` slot that Pi reads from the hook. Goal
  context is preserved by `session_compact` + the per-turn reminder.
- `context`: subscribed as no-op — Pi philosophy prohibits mutating LLM
  messages in extension hooks.
- `tool_call`: only blocks when the user's `askBefore` list matches a `bash`
  command. `until_done_*` tools are excluded from scoring. Every other
  tool gets at least `+2` progress credit.
- Every hook returns `undefined` when it has no opinion so other extensions
  keep control of their own surfaces.

### State persistence

- All goal state is persisted as `CustomEntry` with
  `customType: "until-done.state"` via `pi.appendEntry`.
- `reconstructFromSession` walks `ctx.sessionManager.getBranch()` to replay
  the event log on `session_start` and `session_tree`.
- No external database, no file outside `.until-done/` (tasks.yaml,
  distilled.md), no hidden state.

### UI usage rules

- Use `ctx.ui.notify` for status messages.
- Use `ctx.ui.setStatus` for the footer status line (key: `"until-done"`).
- Use `ctx.ui.setWidget` for the above-editor contract widget (key: `"until-done"`).
- Use `ctx.ui.custom` for the `/until-done detail` full-screen overlay.
- Use `ctx.ui.confirm` / `ctx.ui.select` / `ctx.ui.input` / `ctx.ui.editor`
  for interactive dialogs — always guard with `ctx.hasUI` first.
- Never use `ctx.ui.setEditorText`, `pasteToEditor`, `setHeader`, `setFooter`
  — those fight the user for the input box.
- `pi.sendUserMessage` only for continuation prompts and setup interview.
  Pass `{ deliverAs: "followUp" }` for auto-continuation so it doesn't
  interrupt.

### Tools — not used (intentional)

- `pi.registerProvider` / `unregisterProvider` — not used in production.
  Only the test harness wires a faux provider.
- `pi.setActiveTools` — would silently disable user tools; Pi-philosophy
  violation.
- `ctx.compact` / `fork` / `navigateTree` / `switchSession` / `newSession`
  — user-initiated only.
- `pi.exec` — CI runs through `Bun.spawn` directly to thread `ctx.signal`.
- `pi.setSessionName` / `setLabel` / `setModel` / `setThinkingLevel` — Pi
  drives those.
- Editor-mutating `ctx.ui.*` surface — intentionally left on the table.

---

## The 9 tools

| Tool | When |
| --- | --- |
| `until_done_set` | Lock the North Star contract; requires judge mode |
| `until_done_plan` | Submit the TDD-first task list (once after `set`) |
| `until_done_replan` | Restructure: insert / remove / replace / split / merge / reorder |
| `until_done_task_update` | Patch one task: status, learnings, gotchas, context |
| `until_done_progress` | Record a one-line note + optional phase transition |
| `until_done_complete` | Declare done — requires quoted verifyCommand output; gated by LLM judge |
| `until_done_block` | Pause with a question for the user |
| `until_done_unblock` | Clear a block programmatically (user can also use `/until-done unblock`) |
| `until_done_distill` | After done: compile the journey into `.until-done/distilled.md` |

---

## CI auto-run (agent_end)

When `codeEditsThisTurn > 0` (at least one `edit` or `write` call), `agent_end`
runs `discoverChecks(ctx.cwd)` and executes every discovered CI check via
`runOne`. If any check fails, the goal transitions to `blocked` and Pi
receives a failure block as a follow-up message. This is the primary guard
against broken builds between turns.

Language profiles detected: TypeScript (bun/pnpm/npm/yarn/deno), Python,
Python-uv, Go, Rust, Ruby, Java (Gradle/Maven), Kotlin (Gradle/Maven), Swift,
C++ (CMake/Make/Meson), .NET, Elixir, Erlang, Zig, Lua, Luau, Roblox.

CI checks run through `Bun.spawn` (not `pi.exec`) so `ctx.signal` propagates
correctly (user `Esc` aborts in-flight CI). Output is truncated at
`OUTPUT_TRUNCATION_CHARS` to keep tool results readable.

---

## Cross-model judge (required on every `until_done_complete`)

`until_done_set` requires exactly one of:

- `judgeModel: { provider, modelId }` — a model **different** from the
  executor. Cross-model breaks the Ralph-loop oscillation: the judge has
  no commitment to the executor's history.
- `sameModelJudge: true` — same model, fresh context. Strictly weaker; only
  when no second model is available.

Neither → `until_done_set` refuses with `judge_unspecified`.

The judge sees only: goal, doneCriteria, verifyCommand, executor's evidence.
No executor turn history. Returns strict JSON `{ verdict, reason }`.

- `done` → goal transitions to `done`; reason appended as evidence.
- `continue` → refused; reason appended; executor must address the gap.
- `parse_error` / `unavailable` → fail-open with a warning evidence line
  (judge-infra glitches don't block legitimate completion).

The judge is called inside `executeComplete` via `consultJudge` (cross-model)
or `consultSelfJudge` (same-model). Both use `pi-ai`'s `complete()` outside
the session context so the judge call never pollutes executor history.

Session-level defaults can be set with `/until-done judge <provider>/<modelId>`
and are stored in `store.judgeDefault`. Per-goal `until_done_set` args always
win over the session default.

---

## File-editing rules

1. Run `bun run check` before and after your changes.
2. Every new file gets a JSDoc module comment explaining its role.
3. `types.ts` is the single source of truth for all shared types — don't
   duplicate type definitions elsewhere.
4. `strings/` modules own all user-visible strings — no ad-hoc string
   literals in hooks, tools, or commands.
5. New strings go in the appropriate `strings/` file; new constants in
   `constants.ts`.
6. Tests live in `tests/` and must use the runtime harness in
   `tests/helpers/` — no hand-rolled `ExtensionAPI` mocks.
7. Never commit with an AI co-authorship trailer (e.g. "Co-authored-by:
   GitHub Copilot"). See CONTRIBUTING.md.

---

## Verification

```bash
bun run ci          # must be green before any PR
bun run test        # unit + integration suite (< 5 s locally)
```

The full CI matrix runs on macOS, Ubuntu, and Windows (GitHub Actions). A PR
is only mergeable when all three pass and CodeRabbit approves.
