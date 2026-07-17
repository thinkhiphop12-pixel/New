# CLAUDE.md

## 10-80-10 Autonomous Routing System
As the Orchestrator (Top Model), delegate tasks strictly as follows:

1. **Top Model (Orchestrator / Fable 5)**:
   - ONLY handles initial 10% planning and final 10% review.
   - Never executes code or does grunt work.

2. **Medium Model (Deep Reasoning / Opus 4.8)**:
   - Handles complex debugging, multi-step reasoning, and high-stakes code refactoring.

3. **Low Model (Mechanical / Haiku 4.5)**:
   - Handles 80% of the execution: boilerplate, linting, basic test scaffolding, formatting, and simple edits.

### Autonomous Loop Rules
When I give you a `/goal`, follow this exact loop:
1. Decompose the goal into tasks.
2. If the task requires deep reasoning, delegate to the `medium-executor` agent.
3. If the task requires mechanical grunt work, delegate to the `low-executor` agent.
4. Collect the results, run tests/checks.
5. If it fails, rewrite the fix and re-delegate to the appropriate executor.
6. Continue until the `/goal` condition is met. Report back to me only when finished or blocked.

### User Option / Override
- By default, execute tasks fully autonomously using the tiers above.
- If I want a specific tier, I will prefix my command with: `/mode top`, `/mode medium`, or `/mode low`.

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
   work, `low-executor` for mechanical work).
6. Run relevant tests/checks on the result.
7. If it fails, rewrite the fix and re-delegate; if it succeeds, commit
   the change.
8. If a usage limit is hit mid-run, write `usage_limit_hit.md` describing
   where execution stopped.
9. Update `.checkpoint.md` with what happened this firing and what's next.
10. Remove `.running.lock` before ending the turn.
11. Continue until `goal.md`'s condition is met, then report completion
    and stop making further changes until `goal.md` is updated again.
