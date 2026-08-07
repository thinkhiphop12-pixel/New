# Gaffa — Pre-Release UX Audit

**Reviewer role:** Game Director / Product Design
**Build reviewed:** `src/games/football-manager` @ `claude/football-manager-ux-audit-d7sevh`
**Verdict:** Feature-complete, loop-incomplete. Ship-blocking issues are all in the *connective tissue*, not the systems.

---

## 0. The single root cause

Everything in the brief — "disconnected", "confusing", "lacks flow" — traces back to one structural fact, which I confirmed in the engine:

> **The game has no clock the player can feel.** Time only moves when a match is simulated.

`playRound(state, userReport)` (`engine/seasonProgression.ts`) is the *only* function that advances `state.week`, and it **requires a match report to run**. Everything the player thinks of as "the week happening" — training, sharpness, fitness, injury recovery, dev plans, scouting leads, squad happiness, news, finances — is bolted onto the inside of that one call. Comments across the codebase state it plainly: *"The engine's smallest time unit is a week"* (`TrainingScreen.tsx`), *"weeks, not days, are the sim's smallest unit"* (`GroupHub.tsx`).

The consequences cascade into every complaint:

| Symptom | Cause |
|---|---|
| "Play Next Game" is the only real button | It's the only thing that advances state |
| Training feels disconnected from results | Training resolves *inside* the match click; the player never sees the moment it happens |
| Inbox feels disconnected | Messages appear in a batch after a match, competing with the scoreline for attention |
| Screens are dead ends | Every screen ends with "…now go press the one button on the dock" |
| Scouting/development feel pointless | Their output arrives during the single loudest event in the game and is drowned |
| No sense of progression | The player experiences ~46 clicks per season, not ~300 days |

**Fixing the clock fixes eight of the ten audit categories at once.** This is why it is CRITICAL priority and why almost every other recommendation in this document depends on it.

There is good news: the engine is closer to day-granularity than it looks. `Player.injuryDays` already exists and is the real recovery clock (`injuryWeeks` is derived as `ceil(days/7)`), and `weeklySchedule` is already a **7-element per-day array**. The data model is there. Only the tick is weekly.

---

## 1. The Daily Loop — target design

### 1.1 What the player should be doing every day

The core loop must be **short, varied, and interruptible**. FM's real addiction mechanic is not depth — it's *"just one more day"*. That works because a day is cheap (1 click), usually uneventful (fast), and occasionally demands something (a decision). The variable-ratio reward schedule is the whole trick.

```
┌────────────────────────────────────────────────────────────┐
│  DAY TICK (the only primary button in the game)            │
│                                                            │
│  [ CONTINUE ]  ──►  advance 1 day                          │
│                     ├─ resolve training session            │
│                     ├─ tick fitness / sharpness / injuries │
│                     ├─ tick dev plans + retraining         │
│                     ├─ roll scout reports                  │
│                     ├─ tick AI transfer activity           │
│                     ├─ tick contract / morale events       │
│                     └─ generate inbox items                │
│                                                            │
│           ┌──────────────────────────────────┐             │
│           │  Anything flagged ACTION_REQUIRED?│            │
│           └──────────────────────────────────┘             │
│              NO → auto-continue to next day                │
│              YES → STOP. Surface it. Resolve. Resume.      │
└────────────────────────────────────────────────────────────┘
```

**Critical mechanic: the button is a *hold-to-continue*, not a per-day click.** Press and hold (or press once to start, once to stop) and days flow past at ~350ms each until something stops them. This is what makes the game feel alive rather than like 300 clicks. The label changes contextually:

- `CONTINUE` — normal day
- `CONTINUE TO MATCHDAY` — no events between here and the fixture
- `MATCHDAY — PREPARE` — match is today
- `⚠ ACTION REQUIRED` — the sim has halted

### 1.2 The stop conditions (must be explicit, tunable, and player-controlled)

The sim halts on any of these. Everything else logs to the inbox and keeps flowing:

| Stop | Trigger | Why it stops |
|---|---|---|
| **Matchday −1** | Fixture tomorrow | Team selection, team talk, opposition report |
| **Matchday** | Fixture today | The match |
| **Injury (starter or 7+ days)** | Match or overtraining injury | Squad plan changes |
| **Transfer bid received** | `negotiations.awaiting === 'user'` | Money on the table |
| **Contract expiring < 6 months** | Contract tick | Free-transfer risk |
| **Player unhappiness raised** | `p.unhappy` flips true | The complaint has a response window |
| **Board warning / objective change** | `board.confidence` crosses threshold | Job security |
| **Scout report on a 4★+ target** | `tickScoutNetwork` high-star lead | Actionable, time-limited |
| **Development milestone** | Retraining complete / attribute breakthrough | Payoff moment — must be *seen* |
| **Transfer window open/close (−7 days)** | Calendar | Planning deadline |

Every one of these must be individually toggleable in **Settings → Continue Rules**, exactly as FM does. Players who want to fly through a season must be able to; players who want maximum granularity must be able to. Shipping with a fixed stop-set will alienate one half of the audience.

### 1.3 The Day Summary — the game's most important new screen

When the sim stops, it must not just dump the player back on a hub. It must show **what happened since they last looked**, as a single scannable digest:

```
╔════════════════════════════════════════════════════════════╗
║  THURSDAY 14 SEPTEMBER            ⚠ 2 items need you       ║
╠════════════════════════════════════════════════════════════╣
║  ⚠  ACTION REQUIRED                                        ║
║  ┌──────────────────────────────────────────────────────┐  ║
║  │ 💰 Leeds United bid £4.2m for Marcus Webb            │  ║
║  │    [ Accept ]  [ Negotiate ]  [ Reject ]  [ Later ]  │  ║
║  ├──────────────────────────────────────────────────────┤  ║
║  │ 😠 Danny Cole unhappy — 6 games without a start      │  ║
║  │    [ Reassure ] [ Promise game time ] [ Ignore ]     │  ║
║  └──────────────────────────────────────────────────────┘  ║
║                                                            ║
║  📋 SINCE TUESDAY                                          ║
║  ↗ Training      Squad sharpness 71 → 76  (+5)             ║
║  ↘ Fitness       Squad fitness   88 → 84  (−4)             ║
║  ★ Development   J. Ferreira PAS 68 → 69                   ║
║  🔄 Retraining   T. Obi → RB  ▓▓▓▓▓▓░░░░ 61%  (5wk left)   ║
║  🔍 Scouting     2 new reports filed (1× 4★)               ║
║  🏥 Medical      S. Ndiaye back in 3 days                  ║
║                                                            ║
║  ⚽ NEXT: Saturday vs Barnsley (H) — in 2 days             ║
║                                                            ║
║               [ CONTINUE ▶ ]  (hold to fast-forward)       ║
╚════════════════════════════════════════════════════════════╝
```

This screen alone converts six currently-invisible systems into felt systems. **Every number in it is a delta, not an absolute** — deltas are what create the sense of a living club.

### 1.4 Matchday sub-loop

The current flow drops the player into `MatchScreen` from a dock button. It should become a deliberate three-beat ritual:

1. **Matchday −1 (auto-stop):** Opposition report · predicted XI · your XI vs theirs · press conference · injury/suspension check.
2. **Matchday:** Team talk → match → half-time talk → full time.
3. **Post-match (auto-stop):** Ratings, MOTM, what changed (morale/board/fan confidence deltas), table movement, injuries picked up, next fixture. **Then `CONTINUE` back into the daily flow.** Today the player lands back on `overview` with a toast — the result has no ceremony and no consequence readout.

---

## 2. Screen-by-screen audit

Format per the brief: **What's wrong → Why it's bad UX → What should happen → Exact UI changes.**

---

### 2.1 `GroupHub` (Hub landing) — *the home screen*

**What's wrong.** It is a **menu wearing a dashboard's clothes**. It shows: club header, latest news headline, a 7-row league table slice, a "Coming up" list of *week numbers*, and four group cards each with one line of text. Of the seven questions a dashboard must answer, it answers **two** (next match, unread count).

| Dashboard must answer | Currently answered? |
|---|---|
| When is my next match? | ⚠ Partially — "Week 12", not a date or countdown |
| Who is injured? | ❌ No |
| Who is unhappy? | ❌ No |
| What needs my attention? | ⚠ A red count on a card. No *what*, no *why*, no *where* |
| How is training going? | ❌ No |
| What transfer activity exists? | ❌ Only "£4.2m to spend" |
| What objectives am I tracking? | ❌ No — buried in Club → Board, four levels deep |

**Why it's bad UX.** The home screen is the game's thesis statement. This one says "the game is a set of menus." Worse, there are **two competing home screens**: `GroupHub` (the Hub landing) and `PortalHub` (Matchday → Overview). They duplicate the club header, week badge, and next-fixture info, and the code comments openly acknowledge the duplication and defend it. Players will not learn which one is "home". A new player cannot form a mental model of a game with two front doors.

**What should happen.** Merge them. **One dashboard.** Delete the Hub-landing-as-menu concept entirely — navigation belongs in the rail, not in a screen made of four buttons. The dashboard becomes the default route and the post-match destination.

**Exact UI changes.**

```
╔══════════════════════════════════════════════════════════════════════╗
║ [crest] WREXHAM AFC ★★☆☆☆        Thu 14 Sep 2025   League Two  4th   ║
╠══════════════════════════════════════════════════════════════════════╣
║  ┌─ NEXT MATCH ─────────────────┐ ┌─ NEEDS YOUR ATTENTION ───── 3 ─┐ ║
║  │  SAT 16 SEP · 15:00 · HOME   │ │ 💰 Bid: £4.2m for M. Webb   → │ ║
║  │   WRX  ⚽ vs ⚽  BAR         │ │ 😠 D. Cole unhappy          → │ ║
║  │   4th        11th            │ │ 📄 R. Hughes contract 4mo   → │ ║
║  │   ▸ In 2 days                │ │                               │ ║
║  │   ⚠ Lineup incomplete    Fix │ │ (each row = 1-click resolve)  │ ║
║  │   [Opposition report]        │ └───────────────────────────────┘ ║
║  └──────────────────────────────┘                                    ║
║  ┌─ SQUAD STATUS ───────────────┐ ┌─ OBJECTIVES ──────────────────┐ ║
║  │ 🏥 Injured    2   S.Ndiaye 3d│ │ Board: Finish top 7           │ ║
║  │              ⋮   T.Obi    3wk│ │ ▓▓▓▓▓▓▓░░░  4th — ON TRACK   │ ║
║  │ 😠 Unhappy    1   D.Cole     │ │ Board confidence  ▓▓▓▓▓▓░ 68  │ ║
║  │ 🔴 Suspended  0              │ │ Scenario: 2 promotions/5yr    │ ║
║  │ ⚡ Sharpness  76 ▲5          │ │ ▓▓░░░░░░░  1 of 2             │ ║
║  │ ❤ Fitness    84 ▼4          │ └───────────────────────────────┘ ║
║  └──────────────────────────────┘ ┌─ TRANSFERS & SCOUTING ────────┐ ║
║  ┌─ FORM & TABLE ───────────────┐ │ Window: OPEN — closes in 12d  │ ║
║  │ W W D L W    ↑2 this month   │ │ 🔍 2 new reports (1× 4★)   → │ ║
║  │  3 Stockport   12  22        │ │ 📤 1 offer sent, awaiting     │ ║
║  │ ▸4 WREXHAM     12  21        │ │ 💷 £4.2m budget · £18k/wk     │ ║
║  │  5 Salford     12  20        │ └───────────────────────────────┘ ║
║  └──────────────────────────────┘                                    ║
╠══════════════════════════════════════════════════════════════════════╣
║  [ ⏩ CONTINUE ]  ← persistent, always visible, hold to fast-forward  ║
╚══════════════════════════════════════════════════════════════════════╝
```

Implementation notes:
- Delete `GroupHub.tsx`'s four `fm-groupcard` buttons. Group navigation is the rail's job; it already exists and already carries badges.
- Merge `PortalHub`'s modules into this layout; remove the `all / new / tasks` filter tabs (they hide information on a screen whose entire purpose is to show information — three clicks to see everything you already asked to see).
- **"Needs your attention" rows must be interactive and resolvable inline.** Today `PortalHub`'s Tasks module renders `<li>{t}</li>` — literally **unclickable strings**. That is the single clearest dead end in the build: the game tells you what's wrong and gives you no way to act on it.
- Replace "Week 12" everywhere with real dates. Weeks are an engine detail leaking into the fiction. Add a `state.date` and render `Sat 16 Sep`.
- Move "Abandon career" out of the dashboard body. A destructive, irreversible action does not belong on the home screen next to the league table; it belongs in More → Settings, behind a typed confirmation.

---

### 2.2 `WeeklyScheduleScreen` — *flagged as a priority area*

**What's wrong.**
1. **The connection between action and outcome is invisible.** Seven toggle buttons, three presets, two averages, and a static "Backroom effect" paragraph. Nothing tells the player what *this* schedule will do to *their* squad.
2. **The maths is hidden but simple, and hiding it helps no one.** `applyWeeklySchedule` computes `sharpnessGain = trainingDays × 1.5 + analystQuality/20`, `fitnessGain = recoveryDays × 2.5 + coachQuality/15`. That is a perfectly predictable formula the player could plan around — and the UI shows none of it.
3. **The overtraining warning fires at a threshold, not on a gradient.** At 4 training days: silence. At 5: a red sentence. There is no sense of approaching a cliff.
4. **The days are unlabelled by context.** Saturday is a match day. The schedule doesn't know or care. A player can schedule a heavy training day the day before a cup final and get no warning.
5. **`TrainingScreen` shows a *different, contradictory* week grid** — Mon–Fri all showing the same focus, Sat "Match Day", Sun "Rest" — hard-coded and ignoring `weeklySchedule` entirely. **Two screens show the player's week and they disagree with each other.** This is a correctness-level UX defect.
6. **No automation, no assistant.** The brief asks for both; neither exists anywhere in the codebase (I checked — there is no assistant manager entity at all).

**Why it's bad UX.** A planning screen with no forecast is a slot machine. The player makes a choice, cannot predict the result, waits a week, and receives an outcome they cannot attribute. That destroys the learning loop — the player never builds a model, so the mechanic stops feeling like a decision and becomes a chore.

**What should happen.** The schedule screen becomes a **predictive planner**: every edit updates a forecast in real time, before committing.

**Exact UI changes.**

```
╔══════════════════════════════════════════════════════════════════════╗
║  WEEKLY SCHEDULE                    [🤖 Ask assistant] [Auto-manage]  ║
╠══════════════════════════════════════════════════════════════════════╣
║   MON      TUE      WED      THU      FRI      SAT      SUN          ║
║ ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌══════┐┌──────┐           ║
║ │ 🏋   ││ 🏋   ││ ⚕   ││ 🏋   ││ ⚡   ││ ⚽   ││ 💤   │           ║
║ │Train ││Train ││Recov ││Train ││Sharp ││MATCH ││ Rest │           ║
║ │ HIGH ││ MED  ││      ││ HIGH ││ LOW  ││ BAR  ││      │           ║
║ └──────┘└──────┘└──────┘└──────┘└──────┘└══════┘└──────┘           ║
║   ↑ tap to cycle intensity · drag to fill · match days locked        ║
╠══════════════════════════════════════════════════════════════════════╣
║  PROJECTED — END OF WEEK                                             ║
║  Sharpness  76 ──────────▶ 82  ▓▓▓▓▓▓▓▓░░  +6   ✅ Match-ready      ║
║  Fitness    84 ──────────▶ 79  ▓▓▓▓▓▓▓░░░  −5   ⚠  Below 80         ║
║  Injury risk           LOW ▁▂▃▅ MED         2.4% per player          ║
║                                                                      ║
║  ⚠  Thursday is high-intensity 2 days before a match.                ║
║     Your XI will start Saturday at ~79 fitness (−3% match rating).   ║
║     [ Fix it for me ]                                                ║
╠══════════════════════════════════════════════════════════════════════╣
║  🤖 ASSISTANT — Ray Hollins                                          ║
║  "Two matches this week, boss. I'd go light Thursday and put the     ║
║   recovery in Friday. We'll lose a point of sharpness but we'll      ║
║   finish the Barnsley game with legs."                               ║
║                             [ Apply suggestion ]  [ Ignore ]         ║
╠══════════════════════════════════════════════════════════════════════╣
║  BACKROOM IMPACT                                                     ║
║  Analyst   ✅ M. Trulli (Q72)   +3.6 sharpness/wk    [Profile]       ║
║  Fitness   ❌ VACANT            −4.8 fitness/wk, +40% injury risk    ║
║            You are losing ~£——— of squad availability. [ Hire → ]    ║
╚══════════════════════════════════════════════════════════════════════╝
```

Concrete requirements:
- **Live projection panel.** Recompute `applyWeeklySchedule`'s formula against the current squad on every toggle and render before/after with an arrow and a delta. Pure function, no engine change needed — it's already deterministic apart from the injury roll.
- **Per-day intensity** (Low/Medium/High), not a binary. Binary training/recovery gives the player two dials to express a rich decision; three intensity levels × 7 days is meaningfully more expressive at zero conceptual cost.
- **Match days rendered in the grid and locked.** Read the fixture list; render the fixture on its day. The schedule must know about the calendar.
- **Contextual warnings, not threshold warnings.** "High intensity 2 days before a match", "5th straight training day", "3 players below 70 fitness on matchday". Each carries a **[Fix it for me]** button.
- **`[Auto-manage]` toggle.** Assistant sets the schedule each week; player can still override any day. This is essential for retention — most players do not want to plan a week, every week, for 46 weeks. Give them the option to opt out without opting out of the *outcome*.
- **Introduce an Assistant Manager entity.** Currently no such staff role exists. Add `assistant` to the coach roles; his `quality` determines the accuracy of his advice everywhere in the game (schedule, team talks, transfer valuations, opposition reports). This gives *one clear reason* to spend money on staff and immediately makes the Staff Hub matter.
- **Fix the contradiction:** delete the hard-coded week grid in `TrainingScreen.tsx` and have it read `getSchedule(state)`, or remove it entirely and link to Schedule.

---

### 2.3 `InboxScreen` — *flagged as a priority area*

**What's wrong.**
1. **No priority model.** Every message is a flat row: icon, title, `Category · Week N`. A board ultimatum and a "player is improving in training" note are visually identical.
2. **Almost nothing is actionable.** Actions exist for exactly **two** message types, and both are detected by **regex on the title string**: `/captain/i` and `/playing time|complain/i`. Every other message — scout leads, transfer offers, contract expiries, injuries, board warnings — is read-only prose ending in "check the Transfers tab", asking the player to navigate away and re-find the subject manually.
3. **No decisions with consequences.** The only branching choice in the entire inbox is Reassure/Promise on a complaint.
4. **The inbox is capped at 40 items and silently truncates** (`next.inbox.slice(0, 40)`). Messages the player hasn't read can vanish.
5. **The primary button in the reading view is labelled "Continue"** but only closes the message. In a game where "Continue" will be the day-advance verb, this is a direct collision.
6. **Messages have no sender.** Real FM inboxes have people in them — your assistant, the chairman, an agent, a journalist. Here everything arrives from nobody.

**Why it's bad UX.** An inbox that cannot be acted on is a changelog. Players learn within an hour that reading it changes nothing, start mashing "Mark all read", and from that point the game has lost its primary narrative channel — the one system whose entire job is to make the club feel populated.

**What should happen.** The inbox becomes the **action queue**, and the Day Summary is its front page.

**Exact UI changes.**

```
╔══════════════════════════════════════════════════════════════════════╗
║  INBOX                      [All] [⚠ Action 3] [Unread 7] [Filter ▾] ║
╠══════════════════════════════════════════════════════════════════════╣
║  ⚠  ACTION REQUIRED                                                  ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │🔴│💰│ Leeds United bid £4.2m for Marcus Webb                    │ ║
║  │  │  │ from Sporting Director · expires in 3 days                │ ║
║  │  │  │ Valuation £5.1m · Webb is 3rd choice RW · contract 2yr    │ ║
║  │  │  │ [ Accept ] [ Negotiate ] [ Reject ] [ Remind me later ]   │ ║
║  ├────────────────────────────────────────────────────────────────┤ ║
║  │🟠│📄│ Ryan Hughes' contract expires in 4 months                  │ ║
║  │  │  │ from Sam Okafor, Assistant Manager                        │ ║
║  │  │  │ "He's 29, still first choice. Agent wants £22k/wk."       │ ║
║  │  │  │ [ Offer new deal ] [ Transfer-list ] [ Let him run down ] │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  📋 FOR INFORMATION                                                  ║
║  🔵 🔍 Scout report: Tiago Ferreira (4★)     Ray Hollins    2d ago   ║
║  ⚪ ⚽ Match report: Wrexham 2–1 Barnsley     Press Desk     4d ago   ║
║  ⚪ 🏥 S. Ndiaye returns to training          Physio         5d ago   ║
╚══════════════════════════════════════════════════════════════════════╝
```

Concrete requirements:
- **Add `priority: 'critical' | 'high' | 'normal' | 'info'` and `actions: InboxAction[]` to `InboxItem`.** Actions become data, not regex on titles. `InboxAction = { label, effect, tone }`. This is the single highest-leverage data-model change in this document after the day clock.
- **Two-section list: Action Required (pinned, never auto-truncated) then Information.** Action items survive the 40-item cap; only info items roll off.
- **Every action-required message carries 2–4 inline buttons that resolve it without navigating.** Bid → Accept/Negotiate/Reject. Contract → Offer/List/Ignore. Unhappy player → Reassure/Promise/Sell/Ignore. Scout lead → Shortlist/Scout further/Make an offer/Dismiss.
- **Deadlines.** `expiresInDays` on action items, shown as a countdown, and consequences if ignored — a bid withdraws, a player's agent goes public, a target signs elsewhere. **Ignoring must cost something**, or the priority system is decorative.
- **Named senders with roles.** `from: { name, role }`. Route through existing staff — the assistant, physio, chief scout, chairman. This costs almost nothing and transforms the tone of the game.
- **Consequential decisions.** Promises must be tracked and breakable with morale/reputation cost. The engine already has `promisedStatus` in negotiations and `respondToComplaint` — extend that pattern to board conversations, contract talks, and press.
- **Rename "Continue" → "Close".** Reserve "Continue" for the day clock.

---

### 2.4 Player Development & Retraining — *flagged as a priority area*

**What's wrong.**
1. **The player cannot see the future.** `setDevPlan` and `estimateConversionWeeks` compute a real ETA — and the UI (in `PlayerModal`) surfaces it as a bare number at most. There is no growth curve, no potential range, no "what will this player be at 24".
2. **Retraining progress is invisible until it completes.** `plan.weeksRemaining` decrements silently inside `applyDevPlans`. The player gets **nothing** for 8–12 weeks, then a single inbox line: *"X has completed his conversion to RB."* That is 3 months of real engagement with zero feedback.
3. **Stat plans are a 6% weekly coin flip** (`Math.random() < 0.06`) with no visible progress between successes. Six percent means a typical plan shows no evidence of working for 4+ weeks. Players will conclude it's broken.
4. **The payoff is unquantified.** "He can now also play RB" — so what? What does that unlock? Which formation? Who does it replace?
5. **Manual drills are capped at 3/week and reset inside `playRound`** — so a player who never clicks the dock loses drills silently, and a player who does has no idea the cap refreshed.

**Why it's bad UX.** Development is the emotional core of a management game — the reason people play 15 seasons. Currently it's a fire-and-forget checkbox with a 3-month feedback delay. No progression system in the game is visible; there is no XP, no growth chart, no "look how far he's come".

**What should happen.** Make development a **visible, forecastable, celebrated** curve.

**Exact UI changes** (player profile → Development tab):

```
╔══════════════════════════════════════════════════════════════════════╗
║  TIAGO OBI · 19 · CM · Wrexham                                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  CURRENT 64        POTENTIAL  72–81  (Assistant: "could be special") ║
║                                                                      ║
║   85│                                          ╭┈┈┈┈┈ optimistic     ║
║     │                                    ╭─────╯                     ║
║   75│                          ╭─────────╯━━━━━ projected            ║
║     │                    ╭─────╯                                     ║
║   65│      ●━━━━━━━━━━━━╯╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ conservative        ║
║     │  ●━━╯   (actual)                                               ║
║   55└──┴────┴────┴────┴────┴────┴────┴────┴────┴──                  ║
║      17   18   19   20   21   22   23   24   25                      ║
║      ▲ projection widens with less scouting knowledge                ║
╠══════════════════════════════════════════════════════════════════════╣
║  ACTIVE PLAN — Position retraining: CM → RB                          ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  61%   ·  5 weeks remaining  ·  ETA 12 Nov     ║
║  ├─ Familiarity  ▓▓▓▓▓▓▓░░░  Awkward → Competent → [Accomplished]    ║
║  └─ On completion: can play RB · unlocks 4-2-3-1 wide option ·       ║
║     est. value +£340k                                                ║
║                                            [ Change plan ] [ Cancel ]║
╠══════════════════════════════════════════════════════════════════════╣
║  ATTRIBUTE MOVEMENT — last 12 weeks                                  ║
║  PAC 71 ▲2 ▁▂▂▃▃▃▄▄▄▄▅▅   DEF 58 ▲4 ▁▁▂▃▃▄▄▅▅▅▆▆  ← plan focus     ║
║  PAS 66 ▲1 ▁▂▂▂▃▃▃▃▃▄▄▄   PHY 61 ═0 ▃▃▃▃▃▃▃▃▃▃▃▃                   ║
╠══════════════════════════════════════════════════════════════════════╣
║  🤖 "He's taken to the right-back role quicker than I expected.      ║
║      Give him 5 more weeks and 3–4 starts there and he's ready."     ║
╚══════════════════════════════════════════════════════════════════════╝
```

Concrete requirements:
- **Add a visible `potential` range per player**, narrowing as scouting knowledge increases. Currently the game has *no potential concept surfaced at all* — the strongest single addition available for the effort.
- **Retraining progress bar with named familiarity tiers** (Awkward → Unconvincing → Competent → Accomplished → Natural). Tiers give 4 celebration moments instead of 1.
- **Convert the 6% weekly stat roll into visible accumulating progress.** Keep the same expected rate, but store fractional progress and render it: `PAS 66 → 67 ▓▓▓▓▓▓░░░░ 62%`. Same maths, ten times the feedback.
- **Stop the sim on development milestones** and celebrate them in the Day Summary with a toast + inbox entry from the coach.
- **State the payoff explicitly** on every plan: what it unlocks, estimated value change, ETA date.
- **Move drills onto the daily loop** — 1 drill per training day, prompted on the day, rather than 3 abstract weekly charges the player has to remember to spend.

---

### 2.5 `StaffHubScreen` — *flagged as a priority area*

**What's wrong.**
1. **Hiring is `[Hire (Q40)] [Hire (Q60)] [Hire (Q80)]` — three anonymous buttons.** No name, no wage, no age, no personality, no comparison, no candidate pool. You are buying an integer.
2. **Benefits are prose blurbs, not numbers.** "Speeds development for forwards" — by how much? The engine knows exactly: `posMult = 1 + quality/200`. A Q80 attack coach is a **+40% development rate for forwards**. That is a compelling number and the player is never shown it.
3. **No ROI framing.** A Q80 coach costs a wage the player must weigh against… nothing. There's no "this coach will add ~2.4 OVR across your forwards this season for £6.2k/wk".
4. **No consequence for vacancies.** Six of seven roles can sit empty forever with no visible penalty. The player has no reason to care.
5. **Firing is a single unconfirmed click labelled "Release"** — an instant, irreversible, wage-affecting action with no dialog.
6. **The screen is a bare `fm-panel` list** — no hierarchy, no visual weight difference between a Head Coach and an analyst.

**Why it's bad UX.** This is the clearest instance of "a feature exists but the player won't understand why it matters." The staff system has real, measurable, meaningful effects wired into three separate engine subsystems — and the UI communicates none of them.

**What should happen.** Reframe staff from "a list of slots" to "an investment decision with a stated return."

**Exact UI changes.**

```
╔══════════════════════════════════════════════════════════════════════╗
║  BACKROOM STAFF          Wage bill £14.2k/wk (7.1% of budget)        ║
║  Coverage ▓▓▓▓▓░░░░░ 4/7 roles filled   ⚠ 3 vacancies costing you    ║
╠══════════════════════════════════════════════════════════════════════╣
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ ⚡ FITNESS COACH                                    ❌ VACANT   │ ║
║  │ COSTING YOU: −4.8 squad fitness/wk · +40% overtrain injury risk │ ║
║  │ Est. impact: ~2 extra injuries per season                       │ ║
║  │                                        [ View candidates (6) ] │ ║
║  ├────────────────────────────────────────────────────────────────┤ ║
║  │ 🎯 ATTACK COACH                                    ✅ FILLED    │ ║
║  │ Marco Trulli · 47 · Quality 72 ★★★★☆ · £4.1k/wk                │ ║
║  │ DELIVERING: +36% development rate for your 8 forwards           │ ║
║  │ Season to date: 4 attribute gains attributable                  │ ║
║  │ ROI ▓▓▓▓▓▓▓░░ Good        [ Profile ] [ Upgrade ] [ Release ]  │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
╠══ CANDIDATES — Fitness Coach ═══════════════════════════════════════╣
║          Name           Age  Qual  Wage    Specialism      Effect   ║
║  ○  Ana Beltran          38   81   £5.8k   Injury prev.   +5.4 fit  ║
║  ○  Duncan Fairweather   52   64   £3.2k   Endurance      +4.3 fit  ║
║  ○  Kwame Asante         31   49   £1.9k   Rehab          +3.3 fit  ║
║     [ Compare selected ]                        [ Offer contract ]  ║
╚══════════════════════════════════════════════════════════════════════╝
```

Concrete requirements:
- **Replace the three quality buttons with a generated candidate pool** — 4–8 named candidates per role, refreshing periodically, with age, quality, wage demand, and a specialism. Reuse the existing name generator from `scouting.ts`.
- **Every filled role shows a "DELIVERING:" line with the real computed number** from the engine formula. Every vacancy shows a "COSTING YOU:" line.
- **Comparison table** with multi-select and a side-by-side view.
- **ROI bar per coach** — effect delivered vs wage, relative to the alternatives you could hire.
- **Confirmation dialog on Release,** showing the wage saved and the effect lost.
- **Add the Assistant Manager role** (see §2.2) — the one hire that visibly improves the *player's* experience rather than the squad's stats. This is the tutorial hook for the whole staff system.

---

### 2.6 `ScoutingScreen` — *flagged as a priority area*

**What's wrong.**
1. **The discovery loop is passive and invisible.** Hire a scout, pick a region from a dropdown, then wait. `fileChance(stars) = 0.08 + stars × 0.08` — a 3★ scout files roughly every 3 weeks with no indication anything is happening in between. There is no sense of a search being *conducted*.
2. **Regions are 8 European nations in a `<select>`.** No context — squad size, talent density, cost, whether you have any need there.
3. **Scout quality benefits are stated vaguely** ("find better players") when the engine is precise: higher stars narrow the selection band toward the top of the region's talent pool (`band = pool.length × (0.6 − stars × 0.1)`). A 5★ scout searches the **top 10%**; a 1★ searches the **top 50%**. That's a dramatic difference the player is never told.
4. **Reports are a flat text list.** No player rating, no position, no value, no age, no photo, no comparison to your current squad, and **no action** — just `note` prose and an implicit "go to Transfers and find him yourself."
5. **No assignments beyond region.** Cannot scout a specific player, a specific position, an upcoming opponent, or a competition.
6. **Two parallel scouting systems.** `ScoutingScreen` (named scouts, regions) and `TransfersScreen`'s "Scouting assignments" pills (`assignScout(state, 'player-search' | 'youth')`) from `engine/facilities.ts`. Different concepts, different screens, same word. Guaranteed player confusion.

**Why it's bad UX.** Scouting should be the game's exploration mechanic — the thing that produces "I found him first" stories. Here it's a background process with a text-log output.

**What should happen.** Turn scouting into an **active search with a visible pipeline and a satisfying reveal.**

**Exact UI changes.**

```
╔══════════════════════════════════════════════════════════════════════╗
║  SCOUTING NETWORK           3 scouts · £3.9k/wk · 18 players known   ║
╠══════════════════════════════════════════════════════════════════════╣
║  ASSIGNMENTS                                       [ + New search ]  ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ 🔍 Ray Hollins ★★★★☆   "Right-backs, U23, Portugal"            │ ║
║  │    Progress ▓▓▓▓▓▓▓░░░ 68%  ·  next report in ~4 days          │ ║
║  │    Found so far: 3 players       [ Reassign ] [ Recall ]        │ ║
║  ├────────────────────────────────────────────────────────────────┤ ║
║  │ 👤 Ana Beltran ★★★☆☆   Assessing: TIAGO FERREIRA               │ ║
║  │    Knowledge ▓▓▓▓▓▓░░░░ 60%  →  ratings sharpen as this fills  │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
╠══════════════════════════════════════════════════════════════════════╣
║  REPORTS                              [New 2] [Recommended] [All]    ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ 🟢 RECOMMENDED — fills your weakest position                   │ ║
║  │ TIAGO FERREIRA · RB · 19 · Portugal · Braga B                  │ ║
║  │ Ability  64–68 ▓▓▓▓▓▓░░  Potential  76–84 ▓▓▓▓▓▓▓▓░           │ ║
║  │ Value £1.1m · Wage £6k/wk · Contract 2yr                       │ ║
║  │ vs YOUR BEST RB (D. Cole, 61): ▲ +5 now, ▲ +19 ceiling         │ ║
║  │ 🤖 "Best young right-back we've seen this year. Move fast."     │ ║
║  │  [ Make an offer ] [ Scout further ] [ Shortlist ] [ Dismiss ] │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
╠══════════════════════════════════════════════════════════════════════╣
║  YOUR SCOUTS — what star rating buys you                             ║
║  ★☆☆☆☆  searches top 50% of a region · report every ~6wk · ±12 acc. ║
║  ★★★★★  searches top 10% of a region · report every ~2wk · ±3  acc. ║
╚══════════════════════════════════════════════════════════════════════╝
```

Concrete requirements:
- **Assignment types:** region, position + age filter, named player, next opponent, competition. Reuse `SCOUT_REGIONS` for the first; the rest are thin filters over `state.players`.
- **Visible progress bar per assignment** with an ETA. The wait becomes anticipation instead of absence.
- **Knowledge model:** a scouted player's ratings display as a *range* that narrows with scouting. This is the mechanic that makes scout quality legible and makes scouting *worth doing* rather than a slower way to browse the transfer list.
- **Rich report cards with inline actions** — Make an offer / Scout further / Shortlist / Dismiss. Never make the player leave the screen to act on a report.
- **"Recommended" flag** — cross-reference reports against the squad's weakest position and the budget.
- **Publish the star-rating table** verbatim from the engine formula. Stop describing it, show it.
- **Merge or clearly rename the two scouting systems.** Rename the `facilities.ts` assignments to "Analysis" (opponent reports) and "Youth recruitment", or fold them into this screen as assignment types.

---

### 2.7 `TransfersScreen` — *flagged as a priority area*

**What's wrong.**
1. **Six filters, no guidance.** Position, availability, nationality, max age, search, plus tabs. The player must already know what they're looking for. There is no "we need a right-back", no budget guidance, no squad-gap analysis.
2. **No comparison tool.** You cannot put two players side by side. In a game about squad-building, this is the single most-wanted missing interaction.
3. **The screen carries 8 modes** (hub/search/shortlist/sent/received/loan/squad/budgets/negotiation detail) in 852 lines. Information hierarchy is flat — `fm-label` headings all the way down.
4. **Budget is a number, not a plan.** No wage-bill headroom, no "you can afford £X fee at £Y/wk", no financial-fair-play framing. Overspending is discovered later, in Finances.
5. **No transfer window pressure.** Windows are the deadline that makes transfers exciting. No countdown, no deadline-day event, no "this bid expires".
6. **Negotiation is a form.** Fee, wage, years, status, bonus — five inputs with no indication of what the other club will accept. The player guesses, submits, and waits.

**What should happen.**

- **Open on a needs-driven hub, not a search form:**
  `SQUAD GAPS: RB (weakest, 61 avg) · CB depth (2 senior) · ST age 31+`
  each gap being a one-click pre-filtered search.
- **Comparison drawer:** select up to 4 players → side-by-side attributes, radar overlay (`SpiderChart.tsx` already exists), value, wage, age curve, and "vs your current starter" deltas.
- **Affordability chip on every listing:** ✅ Affordable / ⚠ Stretches budget / ❌ Out of reach, computed from fee *and* wage headroom.
- **Window countdown in the header**, with a deadline-day sequence (accelerated activity, last-minute bids, a stop event).
- **Negotiation feedback:** show the other club's stance as a temperature bar ("Warm — close on fee, unhappy on structure") rather than making the player guess. The engine already computes acceptance internally.
- **Saved searches** that file new matches into the inbox as they appear.

---

### 2.8 `TrainingScreen`

**What's wrong.** Four focus pills, a hard-coded week grid that **contradicts the Weekly Schedule screen** (§2.2), a decorative "8-week intensity" donut whose numbers are a hard-coded presentational table (`INTENSITY_WEIGHTS`) with no engine backing and a hard-coded "8wk" label, a Condition list, three stat tiles, a legacy Assistant coach/Physio upgrade widget that **duplicates the Staff Hub**, and a Run Drill list.

**Why it's bad.** Two staff systems, two week views, and a chart that shows made-up numbers. A player who studies this screen learns things that are not true. This is the most incoherent screen in the build.

**What should happen.**
- Delete the fake intensity donut, or drive it from real per-day intensity once §2.2 lands.
- Delete the week grid; Schedule owns the week.
- Move Assistant coach / Physio upgrades into the Staff Hub. **One place to manage staff.**
- Refocus this screen on **what training produced**: a session report, who gained, who's fatigued, who's flagged, drill outcomes.
- Rename to **Training Report** and make it a destination for the Day Summary's training line.

---

### 2.9 `BoardObjectivesScreen`

**What's wrong.** Read-only. Four panels of bars and a table. No interaction of any kind — the definitive dead-end screen. The board never speaks to you, never sets an interim target, never reacts, never negotiates. "Dismissal risk" is a computed sentence with no narrative around it.

**What should happen.**
- **Surface the objective on the dashboard** (§2.1). Nobody navigates four levels deep to check their job.
- **Make the board a character in the inbox.** Pre-season objective-setting *conversation* (accept / push back / request budget), mid-season check-ins, warnings before the confidence cliff, praise after good runs.
- **Add sub-objectives with progress**: "Reach the 3rd round" ▓▓▓░ · "Keep wage bill under £X" ▓▓▓▓▓▓▓▓ · "Develop a youth graduate".
- **Board requests** — "sell before you buy", "give the academy a chance" — with consequences either way.
- Add a **projected finish** line so "on track" is predictive, not just current-position.

---

### 2.10 Other dead ends (short form)

| Screen | Problem | Fix |
|---|---|---|
| `TableScreen` | Read-only. Can't click a club to see them. | Click row → opponent profile, form, next meeting |
| `FixturesScreen` | Duplicates the dashboard's next-match banner; results list only | Click fixture → full match report; add "days until" |
| `FinancesScreen` | Numbers without narrative — no forecast, no "can I afford this signing" | Add projection, wage-bill headroom, and a link from every transfer decision |
| `YouthAcademyScreen` | Intake happens at season end; nothing to do for 45 weeks | Add coaching focus, youth fixtures, promotion decisions, intake preview from ~week 30 |
| `FacilitiesScreen` / `StadiumBuilder` | Upgrades with unclear payback periods | State ROI in weeks and the exact effect delta |
| `EuropeanScreen` / `CupScreen` | Only relevant a few weeks a season, always present in the tab strip | Hide or grey when not in competition |
| `SeasonEndScreen` | Ends the season, doesn't *frame* it | Season retrospective: best XI, biggest improver, awards, objective verdict, next-season targets |

---

## 3. Cross-cutting findings

### 3.1 Onboarding — nothing exists

I searched the codebase: **there is no tutorial, no first-run flow, no coach marks, no help text, no glossary, no tooltips beyond a few `title` attributes.** A new player lands in an 18-screen hub with a "Play Week 1" button and no idea that Sharpness differs from Fitness, that a Weekly Schedule screen exists, that scouts must be hired, or that development plans are set from a player modal.

**Required for release:**
1. **Guided first week** (5 steps, skippable, ~90 seconds): read your first inbox message → set the lineup → set the schedule (assistant offers to do it) → hire one staff member → continue to matchday.
2. **First-time screen intros** — a one-card explainer the first time each screen is opened, dismissible forever.
3. **A glossary,** reachable from every stat name: what Sharpness is, how it differs from Fitness, why Morale matters, what Chemistry does.
4. **Empty states that teach.** "No leads filed yet — hire a scout" is the right instinct and should be the pattern everywhere; extend it with a button that *does the thing*.
5. **An "Assistant's advice" panel on every major screen** — one sentence, contextual, always present. This is the cheapest possible tutorial and it never expires.

### 3.2 Missing feedback loops

| System | Player does | Player currently sees | Should see |
|---|---|---|---|
| Weekly schedule | Sets 7 days | Two averages, next week | Live projection, then a session report |
| Training focus | Picks 1 of 4 | Nothing attributable | Who improved, because of this focus |
| Dev plan | Sets a plan | Silence for 8–12 weeks | Weekly progress bar + milestones |
| Staff hire | Buys a quality integer | A wage line | "Delivering +36% dev rate", tracked |
| Scout hire | Picks stars + region | Occasional text | Progress bar, knowledge %, rich reports |
| Team talk / press | Picks an option | A morale number moves somewhere | Immediate reaction + result attribution |
| Tactics familiarity | Changes style | `tickTacticalFamiliarity` runs silently | Familiarity bar per tactic |

**Rule for release: no system may change state without a visible, attributed, same-session acknowledgement.**

### 3.3 Missing progression systems

The game has no meta-progression outside the league table. There is no manager XP, no reputation ladder, no unlocks, no career history worth reviewing, no records wall (`state.records` exists and holds `biggestWin` — and is barely surfaced).

**Add:**
- **Manager reputation** — grows with results, trophies, and development; gates which clubs approach you, which players will sign, and how much the board tolerates.
- **Career profile screen** — trophies, seasons, clubs, record signings, best XI, players developed.
- **Achievements/milestones** with inbox celebration — 50th win, first youth graduate to first team, promotion, unbeaten run.
- **Club growth trajectory** — reputation, facilities, and finances as a visible multi-season arc.

### 3.4 Unnecessary clicks

- **Rail → group → sub-tab** to reach anything (2–3 clicks minimum for a screen the player uses daily).
  → Add a customisable favourites row and keyboard shortcuts (`I` inbox, `S` squad, `T` tactics, `Space` continue).
- **Hub landing is a pure menu** — a whole screen whose only job is to route. Delete it (§2.1); the rail already routes.
- **"Check the Transfers tab for details"** — the Offers module tells you a thing exists and makes you navigate to it. Deep-link every reference.
- **Inbox "Mark all read"** is the fastest path through the inbox, which means the inbox is a chore. Fix by making messages actionable (§2.3).
- **Two week-views, two staff systems, two scouting systems, two hubs** — every duplicate doubles the navigation surface for zero added capability.

### 3.5 Information hierarchy

The codebase leans on `fm-panel` + `fm-label` for almost every block, which flattens everything to the same visual weight. There is no consistent notion of *primary / secondary / tertiary* information.

**Establish and enforce three tiers:**
- **Tier 1 — Decisions.** Large, high contrast, with an action attached. Max 1–2 per screen.
- **Tier 2 — Status.** Medium, with deltas and trend arrows. Always shows *change*, not just value.
- **Tier 3 — Reference.** Small, collapsible, behind a disclosure.

And a colour contract, applied consistently: 🔴 needs action now · 🟠 needs action soon · 🟢 healthy · ⚪ informational.

---

## 4. Navigation redesign

**Current:** Hub landing (menu of 4 cards) → 4 groups → 18 screens across sub-tab strips. Two hub screens. Everything two to three clicks deep.

**Proposed:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [crest] WREXHAM   Thu 14 Sep 2025   💰£4.2m   ⚠3   [⏩ CONTINUE]   │  ← persistent
├──────┬──────────────────────────────────────────────────────────────┤
│ 🏠   │                                                              │
│ Home │   (Home IS the dashboard — no menu screen)                   │
│      │                                                              │
│ 📥 3 │   Inbox        ← action queue, badge = action-required only   │
│ 👥   │   Squad        › Squad · Tactics · Training · Schedule       │
│ ⚽   │   Matches      › Fixtures · Table · Cups · Europe            │
│ 💱 1 │   Transfers    › Market · Scouting · Shortlist               │
│ 🏛   │   Club         › Board · Finances · Staff · Facilities ·     │
│      │                  Academy                                     │
├──────┴──────────────────────────────────────────────────────────────┤
│  ★ Favourites:  [Squad] [Schedule] [Shortlist]        (user-set)    │
└─────────────────────────────────────────────────────────────────────┘
```

Changes from today:
- **Home is the dashboard**, not a menu. `PortalHub` and `GroupHub` merge.
- **Inbox is promoted to top level** — it is the game's action queue, not a Club sub-screen sitting between "Club" and "Facilities".
- **"Matchday" → "Matches"**, and Overview leaves it (it's now Home).
- **The header is persistent and carries the clock, the money, the attention count, and CONTINUE** — visible from every screen. Today the action dock only shows a week number and a match button.
- **Badges mean "requires action"**, never "unread". A badge the player learns to ignore is worse than no badge.

---

## 5. Prioritised roadmap

### 🔴 CRITICAL — release blockers

These are the difference between "a set of screens" and "a game".

| # | Item | Why it blocks release | Scope |
|---|---|---|---|
| C1 | **Day-based clock + `CONTINUE`** — add `state.date`, decompose `playRound` into `advanceDay()` (systems) + `playMatch()` (fixture), hold-to-fast-forward | The root cause of every complaint in the brief. Nothing else works without it. | Large — engine |
| C2 | **Stop conditions + Settings → Continue Rules** | Without stops, days are meaningless; without settings, one audience is alienated | Medium |
| C3 | **Day Summary screen** with deltas for training, fitness, development, scouting, medical | Makes six invisible systems visible in one screen | Medium |
| C4 | **Unified dashboard** — merge `GroupHub`/`PortalHub`; answer all seven questions; interactive attention rows | Two front doors and unclickable task strings | Medium |
| C5 | **Actionable inbox** — `priority` + `actions[]` on `InboxItem`, inline resolution, deadlines, named senders | The inbox is the narrative engine and it currently does nothing | Medium |
| C6 | **Schedule projections + warnings** — live forecast panel, contextual warnings, match days in the grid | Directly named in the brief; the action→outcome link is the core learning loop | Medium |
| C7 | **Retraining & development progress bars** — visible weekly progress, familiarity tiers, milestone stops | 12 weeks of silence is a retention killer | Small–Medium |
| C8 | **Fix the contradictions** — one week view, one staff system, one scouting concept | The game currently tells the player things that aren't true | Small |
| C9 | **Onboarding: guided first week + assistant advice line on every screen** | 18 screens, zero guidance, zero tutorial | Medium |

### 🟠 HIGH IMPACT — strongly recommended before release

| # | Item | Payoff |
|---|---|---|
| H1 | **Assistant Manager** entity + advice everywhere + `[Auto-manage]` toggles | Makes staff matter, makes the game teachable, respects players who don't want to micromanage |
| H2 | **Staff Hub rebuild** — named candidates, "DELIVERING/COSTING YOU" numbers, comparison, ROI | Turns a slot list into an investment decision |
| H3 | **Scouting rebuild** — assignments with progress, knowledge ranges, rich actionable reports | Turns a background process into the exploration mechanic |
| H4 | **Player potential ranges + growth projection chart** | The single strongest addition to long-term engagement |
| H5 | **Transfer comparison + squad-gap hub + affordability chips** | Removes the biggest friction in squad-building |
| H6 | **Transfer window countdown + deadline day** | Manufactures the year's biggest tentpole moment for very little work |
| H7 | **Board as a character** — objective negotiation, check-ins, warnings, sub-objectives | Gives the season a narrative spine |
| H8 | **Matchday ritual** — pre-match stop, team talk, post-match consequence readout | The match is the payoff; it currently has no ceremony |
| H9 | **Persistent header** (date, money, attention, CONTINUE) + keyboard shortcuts + favourites | Removes ~40% of routine clicks |
| H10 | **Manager reputation + career profile + milestones** | The missing meta-progression |

### 🟢 NICE TO HAVE — post-launch

| # | Item |
|---|---|
| N1 | Saved transfer searches that file into the inbox |
| N2 | Youth academy as a live system (youth fixtures, coaching focus, intake preview) |
| N3 | Clickable league table → opponent profiles |
| N4 | Season retrospective screen (best XI, awards, biggest improver) |
| N5 | Press/media personality — reputation for how you handle the press |
| N6 | Player relationships (mentors, cliques, partnerships) |
| N7 | Injury detail — types, rehab stages, physio reports |
| N8 | Multi-season club trajectory chart |
| N9 | Data-hub / history browser for stats nerds |
| N10 | Contextual soundscape and haptics on stop events |

---

## 6. The one-sentence summary

**The game has all the parts of a football management game and none of the pacing.** Give the player a day that costs one click and occasionally demands a decision, show them the consequence of every choice within the same session, and let a named assistant explain what they're looking at — and the same eighteen screens that currently feel disconnected will feel like a club.

*Everything else in this document is detail on those three sentences.*
