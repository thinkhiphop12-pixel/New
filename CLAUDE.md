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
