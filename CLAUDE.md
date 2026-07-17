# CLAUDE.md

## 10-80-10 Autonomous Routing System
As the Orchestrator (Top Model), delegate tasks strictly as follows:

### Model Routing Table

**Orchestrator (Fable 5) — planning and review only**
- Use for: planning, architecture, reviewing final output.
- Never use for: mechanical tasks, bulk generation, boilerplate.
- Effort level: high for planning/hard debugging. Never xhigh/max by default — it costs more and often produces worse output.

**`medium-executor` (Opus 4.8) — deep reasoning**
- Use for: complex debugging, multi-step reasoning, high-stakes refactoring — real thinking that isn't architecture-level.

**`fast-worker` (Sonnet 5) — standard execution**
- Use for: code generation, refactoring, standard feature work that's too involved for Haiku but doesn't need Opus.

**`low-executor` (Haiku 4.5) — bulk/mechanical**
- Use for: boilerplate, linting, formatting, simple edits, basic test scaffolding, rename refactors.
- Never spawn further subagents from this tier.

Only these four tiers exist in this environment — do not reference or route to models that aren't wired up here (e.g. Codex, Kimi, DeepSeek), even if seen in outside articles or prompts.

### Autonomous Loop Rules
When I give you a `/goal`, follow this exact loop:
1. Decompose the goal into tasks.
2. If a task needs deep reasoning, delegate to `medium-executor`.
3. If a task is standard execution (not deep reasoning, not pure boilerplate), delegate to `fast-worker`.
4. If a task is purely mechanical grunt work, delegate to `low-executor`.
5. Collect the results, run tests/checks.
6. If it fails, rewrite the fix and re-delegate to the appropriate executor.
7. Continue until the `/goal` condition is met. Report back to me only when finished or blocked.

### Context Discipline
- Keep orchestrator context lean: never re-read files already processed this session.
- Summarize tool/subagent output before folding it back into context — don't carry raw dumps forward.
- Ask executors to return concise conclusions you can act on, not full transcripts.

### User Option / Override
- By default, execute tasks fully autonomously using the tiers above.
- If I want a specific tier, I will prefix my command with: `/mode top`, `/mode medium`, `/mode fast`, or `/mode low`.

## 24h Hourly Build Bot — Stateful Loop Rules

This repo is driven by an hourly trigger that resumes the same session each
time. Because each firing is a fresh turn but a continuing session, state
must live on disk, not in memory. Read `goal.md` and the state files below
at the start of every firing before doing anything else.

### State Files
- `goal.md` — the current standing goal. This is the only file the user
  edits directly to redirect the bot. If it is empty or a placeholder,
  idle: report nothing actionable and end the turn.
- `.running.lock` — presence means a build iteration is already in
  progress (e.g. a prior firing is still working, or crashed mid-run).
  On seeing this file, check its timestamp; if it's stale (older than a
  few hours with no matching process), treat the prior run as dead,
  remove the lock, and log why in `.checkpoint.md` before proceeding.
  Otherwise, skip this firing.
- `usage_limit_hit.md` — presence means a prior firing stopped because it
  hit a usage/rate limit. On seeing this file, do not immediately retry
  full-speed; resume from `.checkpoint.md` and delete this file once a
  firing successfully makes progress again.
- `.checkpoint.md` — the running log of progress: what was done last
  firing, what's next, and any blockers. Update this at the end of every
  firing, success or failure, so the next firing can resume cold.

### Execution Loop
Each hourly firing:
1. Read `goal.md`. If empty/placeholder, do nothing and end the turn.
2. Check `.running.lock`. If present and fresh, skip this firing entirely.
   Otherwise create `.running.lock` for the duration of this firing.
3. Check `usage_limit_hit.md`. If present, resume from `.checkpoint.md`
   instead of restarting the goal from scratch.
4. Read `.checkpoint.md` to recall prior progress.
5. Decompose the next unit of work toward the goal and delegate it via the
   10-80-10 routing rules above (`medium-executor` for reasoning-heavy
   work, `fast-worker` for standard execution, `low-executor` for
   mechanical work).
6. Run relevant tests/checks on the result.
7. If it fails, rewrite the fix and re-delegate; if it succeeds, commit
   the change.
8. If a usage limit is hit mid-run, write `usage_limit_hit.md` describing
   where execution stopped.
9. Update `.checkpoint.md` with what happened this firing and what's next.
10. Remove `.running.lock` before ending the turn.
11. Continue until `goal.md`'s condition is met, then report completion
    and stop making further changes until `goal.md` is updated again.
