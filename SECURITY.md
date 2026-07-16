# Security policy

## Reporting a vulnerability

If you find a security issue in `pi-until-done`, please report it
privately rather than filing a public issue.

- Email: kiren@fantasymetals.com
- Subject prefix: `[security] pi-until-done — <short description>`
- Expected response time: within 7 days

Please include:

1. The version (`pi-until-done` version + Pi version + Bun).
2. A reproducible example or proof of concept.
3. The impact you observed and the impact you believe is possible.
4. Any logs or session JSONL excerpts that help — but redact secrets.

A coordinated-disclosure release will follow once a fix is ready.

## Threat model

`/until-done` is a continuation-loop extension. Its core trust assumption
is that **the active model is the judge**. The extension itself does not
introduce new attack surface beyond what Pi already exposes via its
built-in tools (`read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`).

What the extension does:

- Persists goal state via `pi.appendEntry` (Pi session JSONL only).
- Appends a goal reminder to the system prompt via `before_agent_start`
  (never replaces).
- Runs CI checks via `Bun.spawn` (direct commands, no wrapper) when code
  edits are made in a turn.
- Optionally writes `.until-done/tasks.yaml` and `.until-done/distilled.md`
  inside the project's cwd.

What the extension does NOT do:

- No network calls of its own (only what Pi/the model invoke).
- No credential reads, writes, or transmissions.
- No telemetry, no analytics, no auto-updates.
- No system-prompt replacement (composes only).
- No `pi.setActiveTools` (would silently disable user tools — Pi-philosophy
  violation).
- No daemons, no background processes outside an active Pi session.

## Authorization model

- `askBefore[]` is the user-defined gate for sensitive commands. The
  extension's `tool_call` hook compares each `bash` invocation against this
  list and triggers a `ctx.ui.confirm` dialog (with 30s timeout) before
  the command runs. On dismiss/timeout, the tool is blocked.
- Hard ceiling: turn budget capped at 20000 (with a confirm dialog above
  500), regardless of what the model requests. The orthogonal gates —
  spin guard, clean-end nudge, CI-failure → block, user input,
  `/until-done pause`, and compaction — are turn-independent.
- Any tool the user has not enabled in Pi cannot be invoked by the
  extension.

## Untrusted content

When the model reads untrusted input (web pages, third-party files,
external APIs), prompt injection is possible against the goal contract.
Mitigations baked into the extension:

- The North Star (goal, doneCriteria, verifyCommand, askBefore) is
  **locked** at `until_done_set`; replans cannot change it.
- The verifiability discipline (injected every turn) refuses
  proxy-signal completions and requires quoted `verifyCommand` output.
- The spin-guard blocks the loop when a turn produces no progress
  signals — preventing models from "agreeing" to stop.
