# Close the feature gap with Pro Football Manager 26

> **HANDOFF NOTE — read this first, you are picking this up cold.**
>
> - **Repo**: `/home/user/New` (GitHub `thinkhiphop12-pixel/new`). Next.js 16 /
>   React 19 / TypeScript / Tailwind 3.4 monorepo. The game lives in
>   `src/games/football-manager/` (npm workspace).
> - **Branch**: do all work on `claude/pfm-comparison-analysis-jldpi6`. It
>   currently sits at `e4900b0`, level with the merged default branch. Push with
>   `git push -u origin claude/pfm-comparison-analysis-jldpi6`. Do not open a PR
>   unless asked.
> - **Two reference archives are required and are NOT in this repo.** The user
>   must re-attach them to your session; the scratchpad paths quoted below were on
>   a previous container and are gone.
>   1. `records.zip` — the competitor's full client source. Fallback: re-fetch
>      from `https://pro-football-manager-26.vercel.app`.
>   2. `saveweb2zip...avatarmakersevenvercelapp.zip` — the avatar-maker reference
>      for Phase 15. Fallback: `https://avatar-maker-seven.vercel.app`.
>   Also useful: `IMG_1832.PNG`, the screenshot of the competitor's player modal
>   that Phase 3 must match.
> - **The competitor source is the reference implementation.** Unpack `records.zip`
>   to a scratchpad dir and work from it. Files are
>   named `pro-football-manager-26_vercel_app__js__<module>.js` (core, data,
>   engine, players, match, season, transfers, finances, views, news, saves, odds,
>   scenarios, start, menu3d), plus `__index.html` and
>   `__style_3707fe3d.css` (3,818 lines). Every function name cited below is
>   greppable in those files — read their implementation before writing ours.
> - **Their code is vanilla JS globals; ours is React.** Port the *model and the
>   numbers*, not the architecture. Their comments carry real calibration data
>   ("measured over 300 matches", Dixon-Coles ρ = −0.28, Brier 0.211) — keep those
>   constants, they are tuned.
> - **Build/test commands**: `npm run build` (root), `npm run build:game`,
>   `npx tsx src/games/football-manager/scripts/smoke-test-season.ts`,
>   `npx tsx src/games/football-manager/scripts/sim-test.ts`, `npm run dev` (port
>   3000, host 0.0.0.0).
> - **Decisions already made with the user — do not re-ask:** phased build with a
>   commit per phase; extend the existing FC26 dataset via
>   `scripts/build-gamedata.mjs` rather than importing theirs; include all four big
>   extras (scenarios, stadium stand builder, odds model, three.js menu).
> - `CLAUDE.md` at the repo root defines a 10-80-10 delegation system
>   (`medium-executor` / `fast-worker` / `low-executor` subagents). Follow it.

## Context

You pointed at `pro-football-manager-26.vercel.app`, supplied its full client
source (the uploaded `records.zip`) and a screenshot of its player modal, and
asked for everything it does better — then to adopt its version of each.

Measured scale:

| | Ours | Theirs |
|---|---|---|
| Game logic | ~10,780 lines TS | ~19,000 lines authored JS (26k with libs) |
| Clubs | 240 | 381 + 64 European-only + 25 dormant tier-3 |
| Players | 5,747 (FC26-sourced) | 3,124 authored real + procedural depth |
| Leagues | 10 flat divisions | 21 leagues / 6 countries, real pyramid |
| CSS | Tailwind | 3,818 lines / ~1,370 rules, club-themed tokens |

Ours is Next.js/React with all state in one `GameState` held in
`components/FootballManagerGame.tsx` (`useState`, no store); engine functions
`structuredClone` the state and return a new one. Theirs is vanilla JS globals
with imperative renderers. **We adopt their features and models, not their
architecture** — everything below lands as typed TS in our existing
engine/screen structure.

Decisions taken with you:
- Full gap list up front, then a phased build, one commit per phase on
  `claude/pfm-comparison-analysis-jldpi6`.
- Extend our existing FC26-sourced dataset via `scripts/build-gamedata.mjs`
  rather than importing theirs.
- Include all four big extras: scenarios, stadium stand builder, odds model, 3D menu.

---

## The gap list — what they do better

### A. Player model & data
1. **`potential` per player.** We have none; development is deterministic by age
   (+1/season ≤23, −1/−2 ≥31, cap 94). Theirs drives growth, scouting, value and
   the `▲pot` tag.
2. **Potential overlay on attribute bars + SVG spider chart** (your screenshot):
   each bar shows a current fill over a ghosted potential fill, plus a hex radar
   with Current and Potential polygons. We have neither.
3. **Per-player morale, fitness, sharpness, `chem` (squad familiarity).** We have
   one team-wide `state.morale`.
4. **Height, real `contractEnd` Date snapped to a 31 Jan / 30 Jun window,
   `altPos[]` secondary positions, `releaseClause`, `loyal`, `transferListed`,
   `promisedStatus`, `wantsMove` + reason.** Ours is an int `contractYears`;
   `InboxScreen.tsx:50` fakes a `30/6/YYYY` string from it.
5. **GK-specific attributes** (`gkReflexes`, `gkPositioning`). Ours reuses the
   outfield six for keepers.
6. **Detailed stat tracking**: assists, clean sheets, saves, career injuries,
   `seasonRating`/`ratingCount`, and separate domestic-only mirror stats
   (`lgGoals`/`lgApps`/…) so national awards ignore European games.
7. **Retirement** (`playerRetireAge`, `playerRetirementIntent`). Our players age
   forever against a rating floor.
8. **Position retraining** — convert a player to a new position over time.
9. **Real league pyramid**: 6 countries, 21 leagues, England 5 tiers deep with
   real promotion/relegation, playoff spots, inter-league playoffs
   (Bundesliga *Relegationsspiele*, Ligue 1 *barrage*), UEFA slot allocation, TV
   equal share per league, and Scotland's genuine top-six split (`rounds: 3`,
   `splitSize: 6`). Ours is 10 flat 24-club divisions with promotion only
   between 1↔2↔3 — division 4 and all six European leagues have **no promotion
   or relegation at all**.
10. **Real crests** (`CLUB_BADGES`, ~390 URLs), real stadium names and
    capacities. We draw generated `Crest.tsx` shapes.
11. **Real active loans** seeded from the real world (`REAL_LOANS`).
12. **Free agent pool** across 5 quality tiers with wage/years negotiation before
    signing.
13. **Region-based name pools** with cross-border mixing and per-country
    nationality weights for generated players; **style identities** per club
    (Barça = tiki-taka, Atlético = catenaccio).

### B. Match engine
14. **Shot-level xG with real pitch geometry** — `shotBaseXG(gx, gy)` from
    distance and goal angle using the actual 7.32 m goal, ~15 shot archetypes
    (`tap_in`, `one_on_one`, `box_wide`, `header_cross`, `corner_header`,
    `rebound`…), contact-type multipliers (header 0.56 / volley 0.82 / foot 1.0),
    per-archetype shooter weighting, blockers, GK save resolution, vision-weighted
    assist selection. Ours is a flat `CHANCE_QUALITY` tier table capped at 0.85.
15. **Deep tactical xG chain** (`calcMatchXG`) — mentality, pressing preset,
    press-fit, defensive line, width, tempo, focus-vs-opponent-width, tackling,
    build-up (play-out/balanced/long, *gated on squad passing fit vs opponent
    press*), passing style, runs (into-feet/in-behind, gated on fit vs opponent
    line), counter-attack risk, space quality, diminishing-returns compressor.
16. **Set pieces** — 5 corner routines with their own coefficients, FK
    shoot/cross/short, **per-job takers** (corners L/R, FK shoot, penalties), and
    **player-by-player box assignments** (Near Post, Far Post, Six-Yard, Edge,
    Short Option, Stay Back / Guard Post, Man-Mark, Hold Zone, Second Ball, Stay
    Up) feeding aerial threat, counter exposure and outlet bonus; zonal/man/mixed
    corner defence. Ours counts corners as a stat only.
17. **Penalties in open play** and a **full shootout** — you pick and order 5
    takers, running commentary, sudden death. Our cup draws resolve on
    `Math.random() < 0.5` (`engine/cups.ts`).
18. **Extra time and stoppage time.** Our match is exactly 90 minutes.
19. **Tactical familiarity / drilling** — per-club `tacFam` 0–100 per style and
    formation; 7 drilled styles; `styleKinship` carries partial familiarity when
    you switch; weekly growth with diminishing returns boosted by hired coaches;
    `weeksToDrill` tells you the cost of a switch upfront.
20. **Style execution gating** (`styleExec`) — the XI's actual stats are checked
    against style requirements, offset by league level, so a League Two squad
    simply cannot execute tiki-taka.
21. **Chemistry** — per-player familiarity (new signings start ~30), OOP penalty
    average, same-nationality cluster bonus at 3/5/7+ players.
22. **Out-of-position model** — `POS_DEPTH` ladder, `oopFactor`/`posFitFactor`,
    ST/CF, CM/CDM, CM/CAM as synonyms, `altPos` playing as natural. Applied to
    every stat aggregation.
23. **Opponent-contextual AI tactics** — reads the opponent's line and pressing,
    then adjusts by reputation gap: elite sides impose their identity and never
    park the bus; a minnow vs a giant goes deep and cautious; a mid-gap side only
    picks `counter` if it has actually drilled it. Ours only flips to attacking at
    70' when losing.
24. **Custom formation builder** — arbitrary line counts auto-generate positions
    and role labels; `formation: 'custom'` is first-class. We have a fixed list.
25. **7-type injury model** with severity up to career-ending, day-based recovery,
    and **potential loss** (ACL: −3 pot). Ours is an `injuryWeeks` integer.
26. **Per-minute stamina and sharpness decay** by position/style/tempo applied to
    effective attributes live.
27. **Momentum spell-ownership model + live SVG dual-area momentum graph.** Ours
    is a single bar with no history.
28. **Half-time changes via `reSimFromMinute`** — re-simulates the remainder with
    new tactics/talk while keeping earlier events.
29. **Two-legged ties with running aggregate** in the scoreboard, away-tie logic
    driving whether ET/pens are needed. Every one of our cup rounds is one match.
30. **Context-aware commentary** — hat-tricks, stoppage-time equalisers and
    winners, deadlock broken, parity restored, so lines never contradict the score.
31. **Pitch dots at true coordinates** on a fully-marked pitch, with a **3D/2D
    camera toggle** and a card-flash overlay.
32. **`previewEffectiveXG`** — live xG readout on the tactics screen before you
    play.
33. **`rehearseSetPieces()`** — a 40-sim harness reporting set-piece xG, goals and
    scorers per routine.

### C. Season & competitions
34. **Three European competitions** (UCL/UEL/UECL) on the real **Swiss-model
    league phase** — a truncated round-robin giving each club a distinct opponent
    set, fixtures snapped to Tuesdays and spaced from weekend league games. Ours
    is a flat 8-team QF/SF/Final.
35. **Champions League qualifying play-off** before the league phase, with losers
    dropping into the Europa League.
36. **Seeded knockout draws** with country protection, a 9th–24th playoff round,
    R16 → final, and `resumeStalledKO` recovery.
37. **Promotion playoffs** — your own bracket plus the inter-league relegation
    playoffs, and `processPhantomPool` so unsimulated tier-3 pools still feed
    promotion and relegation churn.
38. **Graded board verdicts** — objective type derived from pre-season rank
    adjusted by reputation (`title/cl/euro/conf/promotion/playoffs/midtable/survive`),
    and `sackScore = gapPenalty + (50 − confidence) ≥ 55` rather than our binary
    "missed && confidence < 20". Never an instant sack for a narrow miss.
39. **Full award set** — Golden Boot (ties on assists, then fewer apps), Golden
    Glove (clean sheets, then saves), Golden Ball (weighted match rating + goal
    contributions + finishing position), continental equivalents, and **nominees
    announced before the winners**.
40. **Starting scenarios** (7): Relegation Battle (take over on Boxing Day,
    points already docked, first half-season simulated forward), Hollywood Story,
    Broke, The Takeover, Wonderkid Factory, Against All Odds, Points Deduction
    (start on −24). We have none.
41. **Winter break and a realistic calendar** in schedule generation.

### D. Transfers
42. **Negotiation state machine** — `asking`/`minFee`/`wageDemand`/`minWage`,
    round counters, accept/counter/reject, **walk-away after 3 rounds**, and a
    `holdOut` where a club rebuffs a bid that *does* meet its minimum and then
    raises the price 12%. Ours is one-click buy at `value × 1.15`
    (`engine/transferMarket.ts`).
43. **Availability-driven asking price** (listed / unsettled / expiring /
    settled) with young/potential/reputation premia.
44. **Player agency** — `playerPrestige`, `assessMove`, `prestigeRejectChance`,
    `clubStature`, `leagueStanding`, `projectedRole`: a star refuses a step down.
45. **Bidding wars, counter-offers and asynchronous deadline responses**
    (`rollBiddingWars`, `playOffBidders`, `resolveNegotiationResponses`).
46. **Real loans** — wage-share percentage, playing-time clauses (Regular starter
    45% of games / Squad player 22%), option to buy, recall rights, weekly clause
    ticking that warns both sides, and an AI parent that **actually exercises
    recall** if the borrower keeps benching him. `loanSpellStats` tracks form
    since the loan started. Ours is a season-long flag with no fee or stats.
47. **Release clauses** — seeded realistically (55% of La Liga players, 20% of
    prospects, 12% of 80+ OVR), triggerable to bypass the club entirely.
48. **Pre-contracts / Bosman** signings for expiring players.
49. **Transfer bans** per player (post-negotiation cooldown) plus the club-wide
    FFP embargo.
50. **Squad promises** — promise a player key-man status, bench him, he downs
    tools.
51. **Transfer requests** from unhappy players, with a stated reason (ability /
    ambition / game time).
52. **Market filter bar** — price and rating sliders, tags, infinite scroll.

### E. Finances
53. **Three sellable sponsor slots** — Shirt Front, Sleeve, Stadium Naming Rights
    (3/5/8-year terms) — priced off a market model calibrated to real commercial
    income by division and reputation, with **performance clauses**, renegotiation,
    renewal and early termination. Plus a separate **kit deal** track. We have
    zero sponsorship.
54. **FFP** — 3-year rolling loss, warning inbox reminders, then a **points
    deduction** after ~8 weeks of sustained breach.
55. **Squad Cost Ratio** — `(wages + amortization) ÷ football revenue`, 70% limit;
    sustained breach → **transfer embargo**, a further year → another points
    deduction; lifts automatically on recovery.
56. **Transfer fee amortization** spread across contract length, feeding SCR.
57. **Board confidence 0–100** driving sponsor offer quality, **board grants**,
    funding requests and the sack threshold (−35 on a sacking verdict).
58. **Matchday income model** — capacity, ticket pricing tier, zone pricing, price
    multipliers, opponent and competition, with a per-fixture income preview.
    Ours is a flat `GATE_BASE` by division.
59. **Parachute payments, TV equal share by league, merchandising, European prize
    money.**
60. **Granular expense lines** — wages, transfers, agent fees, backroom,
    scouting, coaching, academy funding and upkeep, stadium/training/rehab
    maintenance, retraining.
61. **Balance-history sparkline with hover tooltips** and a per-season financial
    history table.

### F. Facilities, staff & scouting
62. **Stand-by-stand stadium builder rendered as SVG** — four named stands plus
    four corner blocks, each split into slots with tiers, per-slot type/size/
    capacity/cost, demolition, clickable zone legend and detail panel, capped by
    the club's real ground capacity. Ours is a 3-level integer.
63. **Training ground and rehab/medical centre** as separate facilities, each with
    its own progress track and SVG.
64. **Academy with its own reputation**, capacity, intake count scaled by rating,
    prospect interest chance, and funding levels with a cap. Ours is 3 levels and
    1–2 intakes a season.
65. **Named coaches hired into slots**, whose quality feeds the tactical drilling
    multiplier and player development. Ours is three anonymous integer staff
    levels.
66. **Projects system** — every upgrade is a timed project (2–10 weeks scaled by
    spend) with a live progress bar and partial-credit accounting. Ours are
    instant purchases.
67. **Real scouting** — assignable scouts with due dates and weeks remaining,
    opponent scouting reports, filtered player search, youth prospect scouting.
    Our `ScoutScreen.tsx` shows static leads and a shortlist that is **not even
    persisted**.

### G. Saves & persistence
68. **IndexedDB** for the payload with a cheap **localStorage metadata index** —
    explicitly because the 5–10 MB localStorage quota was too small. We
    `JSON.stringify` the entire 5,747-player state into localStorage on every
    action and **silently swallow quota failures** in `lib/storage.ts`.
69. **LZ-String compression inside a generated Web Worker** (Blob URL), writes
    scheduled on `requestIdleCallback`, so saving never blocks the UI.
70. **`beforeunload` emergency save** absorbed back into IndexedDB on next boot.
71. **Real migration chain** — legacy relocation, missing slot IDs, pre-AI-tactics
    saves, window-aligned contract dates, and a full attribute re-roll for saves
    predating the real stat data.
72. **Date-preserving replacer/reviver.**
73. **5 manual slots + autosave**, cards showing crest, season, date and league
    position. Ours parses and migrates every full save just to draw the menu.
74. **Mid-match save and restore.**

### H. Presentation & extras
75. **Calibrated bookmaker** (`js__odds.js`) — scoreline distribution from the
    engine's own `previewEffectiveXG`, **Dixon-Coles low-score correction**
    (ρ = −0.28) fitted against 1,100 simulated matches (Brier 0.211); markets for
    1X2, BTTS, over/under 1.5/2.5/3.5, clean sheets, top-6 correct scores,
    anytime scorer; ~5.2% overround converted to real **British fractional odds**
    from a 70-entry ladder; **season outrights** (title / top four / relegation)
    as a 200-run Monte Carlo over the real remaining fixtures, cached per date.
76. **Generated press desk** — 17 story generators with per-story cooldowns (title
    race, relegation scrap, Golden Boot race, player of the month, breakout
    player, career milestones, manager pressure, big-5 roundup, transfer splash,
    rumours…), articles as structured HTML with sub-heads, pull quotes, mini
    league tables and stat tables, plus a written report of every one of your
    matches. Ours is a plain inbox.
77. **three.js 3D stadium menu** — procedural pitch/crowd textures, built stands,
    floodlights with glow sprites, animated camera.
78. **Club theming** — a `--brand` custom property recolours the UI to your club
    while semantic colours stay fixed.
79. **Toast queue and a modal system that pauses the live match.**
80. **Reputation stars** as a first-class currency across transfers, board and
    player decisions.
81. **Rich start flow** — home → save slot → scenario picker → country tabs →
    league tabs → searchable club grid with crests → confirm card showing rep
    stars, wage budget and squad rating.

### I. Aesthetics & design system
Their stylesheet is a single 3,818-line, ~1,370-rule hand-authored system. Ours
is Tailwind plus a token block in
`src/games/football-manager/app/globals.css`. What theirs does better:

82. **Club-identity theming done correctly.** A `--brand` custom property is
    overridden per club at game start (`applyClubTheme` in `start.js`, with
    `mixHex`/`textOn` for readable contrast) and is used **only for pure UI
    chrome** — sidebar active state, primary buttons, active tab pills. Win/loss,
    finance and table-zone colours stay pinned to fixed
    `--accent`/`--accent-red`/`--accent-gold` tokens **so their meaning never
    depends on which club you manage**. `--brand` defaults to `--accent` so the
    pre-club start screen is unaffected. We have no club theming at all.
83. **A calmer, more professional palette.** Theirs is a desaturated neutral
    slate (`--bg0 #050506` → `--bg4 #1d2129`, `--bg-card #101319`) with
    *opaque* surface tokens. Ours uses `rgba(255,255,255,0.04…0.09)` translucent
    panels over a near-black, which stacks unpredictably when panels nest.
    Their accent is a professional `#00d084` green; ours is a high-chroma lime
    `#b8ff3c` that fights the gold and blue accents.
84. **An 8-colour semantic accent set** — `accent`, `accent2` (cyan), gold, red,
    blue, purple, plus `--text`/`--text-muted`/`--text-dim`/`--text-neg` — versus
    our looser ad-hoc set.
85. **Real per-league brand colours** (`--pl-purple #38003c`,
    `--la-liga-orange`, `--bundesliga-red`, `--serie-a-blue`, `--ligue1-white`)
    used on league chrome.
86. **Self-hosted Inter variable font** shipped as one `woff2` covering weights
    100–900, plus `--font-display: 'Space Grotesk'` for headings. Their comment
    notes Inter was in the stack for ages but never actually shipped, so every
    machine silently fell back to a system font — worth checking we aren't doing
    the same.
87. **`font-variant-numeric: tabular-nums`** on all tables, money and stat
    values so figures align and don't jitter as they tick. We don't do this
    anywhere, and it is very visible on a league table.
88. **A unified elevation scale** — `--shadow-sm`/`--shadow`/`--shadow-lg`, a
    `--card-hi` inset top highlight on cards, a radius scale
    (`--r-sm` 8 / `--r` 12 / `--r-lg` 16) and one `--transition: 0.16s ease`.
89. **A shared flat "stat tile" treatment** — one hairline border applied across
    every small chip/row (budget breakdowns, bench rows, scout rows, knockout
    ties, wage items) so they stop reading as disconnected flat fills next to
    bordered cards.
90. **Accessibility basics we lack**: `color-scheme: dark`, consistent
    `:focus-visible` outlines with offset on every button and `[tabindex]`,
    explicit disabled styling, and a themed `::selection`.
91. **An ambient brand-tinted radial gradient** on `body` built with
    `color-mix(in srgb, var(--brand) 7%, transparent)` so the background glow
    itself follows the club colour.
92. **A fully-marked CSS pitch** — penalty areas, six-yard boxes, spots, arcs,
    corner arcs, goals annotated at true 7.32 m × 2.44 m — used for the shot map.
93. **Hand-drawn inline SVG icons** for all 11 sidebar views. We use
    `lucide-react`, which is fine, but theirs are consistent with the pitch/crest
    artwork.
94. **Screen transitions** (`.screen { transition: opacity .3s, transform .3s }`)
    and keyframe animation for card flashes, goal moments and toasts.

**Aesthetic work is Phase 14** below, but two items should land early because
later phases build on them: the `--brand` theming contract (82) and the token
palette (83–84, 87–89). Do those in Phase 0.

### J. Problems in our repo found during the audit
95. Dead code: `components/MatchDayScreen.tsx`, `components/MatchPitchView.tsx`,
    `components/live2d/*` have no importers; four `.zip` archives are committed
    inside `components/` and `engine/`.
96. **Two disagreeing engines**: `engine/matchSimulation.ts` (old Poisson sim)
    runs every AI and cup match while `engine/tickEngine/sim.ts` runs only yours.
97. Every user action deep-clones ~5,700 players and re-serializes the save.
98. `ScoutScreen.tsx`'s shortlist is component `useState` — it is lost on tab
    change and never persisted to `GameState`.
99. Settings and the manager avatar live in localStorage keys *outside* the save,
    so they don't travel with a save slot.

---

## Implementation phases

One commit per phase on `claude/pfm-comparison-analysis-jldpi6`. Each ends green
on `npm run build` plus the existing smoke tests.

### Phase 0 — Foundation (68–74, 82–84, 87–89, 95–99)
Unblocks everything: the richer model will not fit in localStorage, and later
phases will build UI against the new tokens.
- Rewrite `src/games/football-manager/lib/storage.ts` — IndexedDB payloads,
  localStorage metadata index, LZ-String compression in a Web Worker (their
  `lzFactory` is inlined in `js__saves.js`; build the worker from a Blob URL as
  they do), idle-scheduled writes, `beforeunload` emergency save, Date-aware
  replacer/reviver, migration of the existing three `fmlite.save.*` slots.
  **Stop swallowing write failures** — surface them.
- Move settings and the manager avatar into `GameState` so they travel with the
  slot; persist the scout shortlist there too.
- Delete `components/MatchDayScreen.tsx`, `components/MatchPitchView.tsx`,
  `components/live2d/*` and the four committed `.zip` files; retire
  `engine/matchSimulation.ts` so `engine/tickEngine/sim.ts` resolves every match
  via a fast non-visualised path.
- Replace `structuredClone`-per-action with a reducer over a draft; debounce
  persistence.
- Token pass in `app/globals.css`: adopt their opaque slate scale, the 8-colour
  semantic accent set, `--brand` with the chrome-only contract described in gap
  82, the radius/shadow/transition scales, `tabular-nums` on tables and money,
  the shared stat-tile border, `color-scheme: dark`, `:focus-visible` outlines
  and a themed `::selection`. Self-host Inter variable and verify it actually
  loads.

### Phase 1 — Player & club data model (1, 3–8, 10–13)
- Extend `Player` in `engine/types.ts`: `potential`, `morale`, `fitness`,
  `sharpness`, `chem`, `height`, `altPos[]`, `contractEnd` (window-snapped),
  `releaseClause`, `loyal`, `transferListed`, `wantsMove`, `promisedStatus`,
  `retireAge`, `gkReflexes`, `gkPositioning`, assists/cleanSheets/saves and the
  domestic-only mirror stats.
- Regenerate `public/data/gamedata.json` via `scripts/build-gamedata.mjs`
  (potential from age + rating, height and altPos from the FC26 source, contract
  ends spread across windows, release clauses seeded by league and profile).
- Back-fill everything in `storage.ts` `migrate()` so existing saves load.
- Rewrite development in `seasonProgression.ts` to converge on `potential`; add
  retirement and position retraining.
- Real crests and stadium capacities; free-agent pool with negotiation.

### Phase 2 — League pyramid (9, 37, 41)
Restructure `engine/gameRules.ts` and `seasonProgression.ts` into per-league
definitions carrying `relegation`, `autoPromotion`, `playoffSpots`,
`interPlayoff`, UEFA slots and `tvEqualShare`; add promotion playoffs, dormant
tier-3 pools, the Scottish split, and a winter break.

### Phase 3 — Player modal (2)
Their modal from your screenshot: club-coloured initials avatar, nationality ·
age · height, position badges + OVR + `▲pot`, Ratings/Stats tabs, attribute bars
with a ghosted potential fill, hex radar with Current and Potential polygons.
New `components/PlayerModal.tsx` + `components/SpiderChart.tsx`, replacing the
inline detail panel in `SquadScreen.tsx`.

### Phase 4 — Match engine core (14–15, 22, 25–26, 30–32)
Rework `engine/tickEngine/sim.ts` around shot-level xG with pitch geometry and
shot archetypes; add the tactical multiplier chain, out-of-position model,
7-type injuries with potential loss, stamina/sharpness decay, context-aware
commentary, stoppage time. `components/match/PitchCanvas.tsx` gets true shot
coordinates and the 2D/3D toggle.

### Phase 5 — Tactics depth (16, 19–21, 23–24, 33)
New `engine/familiarity.ts` (drilling, style kinship, `weeksToDrill`,
`coachDrillMult`) and `engine/setPieces.ts` (routines, takers, box jobs,
defensive schemes). Contextual AI tactics and the custom formation builder in
`TacticsScreen.tsx`, plus the live `previewEffectiveXG` readout.

### Phase 6 — Match presentation (17–18, 27–29)
Penalties in open play, extra time, the full shootout overlay with taker
ordering, two-legged aggregate display, the SVG momentum graph, and half-time
changes via re-simulation from the split minute.

### Phase 7 — Transfers (42–52)
New `engine/negotiation.ts` for the state machine; rewrite
`engine/transferMarket.ts` and `components/TransfersScreen.tsx`. Adds
`GameState.negotiations`, player agency, bidding wars, loans with clauses and
recall, release clauses, pre-contracts, bans, promises and the filter bar.

### Phase 8 — Finances (53–61)
New `engine/finances.ts` — sponsor slots with clauses, kit deals, FFP, SCR,
amortization, embargo, points deductions, board grants, ticket pricing,
parachute/TV/merch/Euro income, granular expenses. Rewrite
`components/FinancesScreen.tsx` with the balance sparkline and season breakdown.

### Phase 9 — European competitions & awards (34–36, 38–39)
Swiss-model league phase for UCL/UEL/UECL, qualifying play-off, seeded draws with
country protection, two-legged knockouts, graded board verdicts with sack
scoring, and the full award set with nominee announcements.

### Phase 10 — Facilities, staff & scouting (62–67)
New `engine/facilities.ts` + `components/StadiumBuilder.tsx` (SVG stand builder),
training ground and rehab facilities, academy reputation and intake, named coach
hiring, the timed-projects system, and a real scouting network with assignments
and opponent reports.

### Phase 11 — Scenarios (40)
`engine/scenarios.ts` with all seven challenges and season-end evaluation, wired
into the start flow as a scenario picker.

### Phase 12 — Odds & news (75–76)
`engine/odds.ts` (Poisson + Dixon-Coles, markets, fractional ladder, Monte-Carlo
outrights) as an Odds tab on the table screen. `engine/news.ts` with the 17 story
generators and structured articles into the existing inbox.

### Phase 13 — Presentation (77–81)
three.js stadium menu behind `MainMenuScreen` (their `js__menu3d.js`: procedural
striped-pitch and crowd canvas textures, built stands, floodlights with glow
sprites, animated camera — three.js r160, add as a dependency), club theming
wired from the club palette into `--brand`, toast queue, match-pausing modals,
reputation stars, and the richer start flow with country/league tabs and a
searchable club grid with crests.

### Phase 15 — Manager character designer
Upgrade the existing `CharacterCustomizerScreen.tsx` against the
`avatar-maker-seven.vercel.app` reference (two-tone skin, separate colour axes,
randomize, PNG export) and surface the avatar in the hub, press conferences,
dugout and season review. Cosmetic only. Independent of every other phase — can
be done at any point after Phase 0. See the execution guide for detail.

### Phase 14 — Aesthetic polish (85–86, 90–94)
Per-league brand colours on league chrome, `Space Grotesk` display face for
headings, the fully-marked CSS pitch with true-scale goal annotations for the
shot map, consistent inline SVG sidebar icons, screen transitions, and keyframe
animations for card flashes, goals and toasts. Final accessibility sweep.

---

## Verification

- `npm run build` at the repo root and `npm run build:game` after every phase.
- `npx tsx src/games/football-manager/scripts/smoke-test-season.ts` — must
  complete a full season without throwing; extended per phase (promotion
  playoffs resolve, FFP embargo fires, shootouts terminate, Swiss draw produces a
  valid fixture set).
- `npx tsx src/games/football-manager/scripts/sim-test.ts` — goals per game must
  stay in a realistic 2.4–3.2 band after every engine change; after Phase 12,
  also check the odds model's Brier score against simulated results.
- After Phase 0, confirm a pre-existing localStorage save loads and migrates into
  IndexedDB.
- `npm run dev` pass over the screens each phase touches; the Phase 3 modal
  should visually match the supplied screenshot (`IMG_1832.PNG`: Leandro
  Trossard, red circular initials avatar, "Belgian · Age 30 · 181cm", LW badge +
  `ST·LM` alt positions + blue `82`, Ratings/Stats pill tabs, six coloured
  attribute bars, hex radar with green Current polygon and dashed Potential
  outline, Current/Potential legend).
- Aesthetic check after Phase 0 and Phase 14: switch clubs and confirm `--brand`
  moves only sidebar/button/tab chrome while win/loss, finance and table-zone
  colours stay fixed.

## How to implement — execution guide

### Standing method for every phase

1. **Read the reference first.** Open the corresponding
   `pro-football-manager-26_vercel_app__js__<module>.js` and read the functions
   named in the gap list *before* designing ours. Their comments carry tuned
   constants — copy the numbers, don't re-derive them.
2. **Engine before UI.** Add types to `engine/types.ts`, then pure logic in a new
   `engine/*.ts`, then screens. Engine modules must stay free of React imports so
   the `scripts/*.ts` harnesses can run them under `tsx`.
3. **Migration in the same commit as the model change.** Any new `Player` /
   `Club` / `GameState` field gets a back-fill in `migrate()` in
   `lib/storage.ts` and a version bump, in the same commit. A save that loaded
   before the commit must load after it.
4. **Extend the smoke test in the same commit.** `scripts/smoke-test-season.ts`
   gets a new assertion per phase (listed below). This is the regression net —
   there is no unit test suite.
5. **Commit per phase**, message `feat(fm): <phase name>`, then
   `git push -u origin claude/pfm-comparison-analysis-jldpi6`.
6. **Delegate per `CLAUDE.md`**: `medium-executor` for the engine/maths phases
   (0, 4, 5, 8, 9, 12), `fast-worker` for screens and standard feature work
   (3, 6, 7, 10, 11, 13), `low-executor` for the mechanical passes (dead-code
   deletion, token renames, icon swaps). Effort Medium by default, High only for
   Phases 4 and 9.

### Phase 0 — Foundation (do this first, it is load-bearing)

Order matters within the phase:

**0a. Dead code (mechanical, do it first so later greps are clean).**
Delete `components/MatchDayScreen.tsx`, `components/MatchPitchView.tsx`,
`components/live2d/`, and the four `.zip` files under `components/` and
`engine/`. Confirm with `grep -r` that nothing imports them, then
`npm run build:game`.

**0b. Storage rewrite** — `lib/storage.ts`. Target shape:

```ts
interface SaveIndexEntry {          // localStorage, tiny, drives the menu
  slot: number; club: string; crest: string; season: number;
  position: number; savedAt: number; version: number;
}
export async function saveGame(state: GameState, slot: number): Promise<void>
export async function loadGame(slot: number): Promise<GameState | null>
export function listSaves(): SaveIndexEntry[]   // sync, index only, no parse
```

- IndexedDB store `fm.saves`, key = slot number, value = compressed string.
- Port `lzFactory` from `js__saves.js` into `lib/lz.ts`; build the worker with
  `new Worker(URL.createObjectURL(new Blob([workerSrc], {type:'text/javascript'})))`
  exactly as they do, so there is no separate worker file to bundle.
- Writes go through `requestIdleCallback` with a dirty flag; `beforeunload`
  writes an uncompressed emergency blob to a single localStorage key, absorbed
  into IndexedDB on next boot.
- `migrate()` keeps its current back-fill chain and gains the localStorage→
  IndexedDB relocation as migration step 1.
- **Do not catch-and-ignore**: a failed write must set an error state the UI can
  show.

**0c. State plumbing.** `components/FootballManagerGame.tsx` currently holds
`GameState` in `useState` and calls `apply()` on every change, deep-cloning
~5,700 players. Replace with `useReducer` over a draft (Immer, or a hand-rolled
draft — Immer is not currently a dependency, adding it is fine). Persistence
moves to a debounced effect (~1s) rather than every action. Move `settings` and
`managerProfile` into `GameState` and out of their standalone localStorage keys;
persist the `ScoutScreen` shortlist there too.

**0d. Design tokens** — `app/globals.css`. Replace the translucent
`rgba(255,255,255,0.0x)` panel tokens with their opaque slate scale, add the
8-colour semantic set, the radius/shadow/transition scales, and define:

```css
--brand: var(--accent);        /* per-club, chrome only */
--brand-text: #04140d;
```

Write the rule down in a comment: `--brand` may be used for sidebar active
state, primary buttons and active tab pills **only**. Everything with meaning
(win/loss, finance up/down, promotion/relegation zones) stays on the fixed
tokens. Add `font-variant-numeric: tabular-nums` to tables/money/stat classes,
`color-scheme: dark`, `:focus-visible` outlines, `::selection`, and the shared
stat-tile hairline border.

**Phase 0 done when**: an existing localStorage save loads and is migrated into
IndexedDB; `listSaves()` does no JSON parsing of payloads; the smoke test still
completes a season; club colours are not yet wired but `--brand` resolves to the
accent everywhere.

### Phase 1 — Player & club data model

- Add fields to `Player` in `engine/types.ts` (list in gap A). Make
  `contractEnd: string` an ISO date snapped to 31 Jan / 30 Jun as they do.
- `scripts/build-gamedata.mjs` derives the new fields from
  `scripts/fc26-source.json`:
  - `potential` — age-curve over current rating: young high-rated players get the
    largest gap; ≥30 gets `potential = rating`. Cap 99.
  - `height`, `altPos` — from the source where present, else position-skewed
    defaults as in their `generatePlayer`.
  - `releaseClause` — seed at their rates: 55% of La Liga players, 20% of
    prospects, 12% of 80+ OVR.
  - `gkReflexes`/`gkPositioning` for keepers.
- `migrate()` back-fills all of it for existing saves (bump to version 3).
- Rewrite development in `seasonProgression.ts` to converge on `potential`
  instead of the flat +1/−1 age rule; add retirement (`retireAge`,
  `playerRetirementIntent`) and position retraining.
- **Smoke test assertion**: after 5 simulated seasons, no player exceeds their
  `potential`, and at least one player has retired.

### Phase 2 — League pyramid

Convert `engine/gameRules.ts`'s flat `DIVISION_NAMES` / `STARTING_BUDGET` maps
into a single `LEAGUES: LeagueDef[]`:

```ts
interface LeagueDef {
  id: string; name: string; country: string; level: number;
  clubCount: number; rounds: number; splitSize?: number;   // Scotland
  autoPromotion: number; playoffSpots: number; relegation: number;
  interPlayoff?: string; interPlayoffFeeder?: string;      // BL / Ligue 1
  championsLeague: number; clPlayoff: number;
  europaLeague: number; conferenceLeague: number;
  tvEqualShare: number;
}
```

Everything that currently branches on `Division` (a 1–10 union) keys off
`LeagueDef` instead. This is the widest-reaching refactor in the plan — expect
to touch `seasonProgression.ts`, `TableScreen.tsx`, `FixturesScreen.tsx` and
`gameRules.ts` together. Add promotion playoffs, dormant tier-3 pools
(`processPhantomPool`), the Scottish split and a winter break.

**Smoke test assertion**: every league promotes and relegates the right count;
no club ends a season in two leagues.

### Phase 3 — Player modal

Pure UI, no engine work — good first visible win. New
`components/PlayerModal.tsx` and `components/SpiderChart.tsx`. Port
`buildSpiderChart` from `js__players.js` (it emits SVG; ours returns JSX). The
attribute bar is two stacked fills in one track: potential (ghosted, behind) then
current (coloured by band, in front). GK players swap the six outfield attributes
for the reflexes/positioning set. Replace the inline detail panel in
`SquadScreen.tsx` and reuse the modal from Transfers, Scout and Inbox.

### Phase 4 — Match engine core (highest-risk phase)

Rework `engine/tickEngine/sim.ts`. Port in this order, checking
`scripts/sim-test.ts` stays in the 2.4–3.2 goals/game band **after each step**:

1. `shotBaseXG(gx, gy)` — distance and goal angle against the real 7.32 m goal.
2. Shot archetypes (~15) with location ranges, contact multipliers
   (header 0.56 / volley 0.82 / foot 1.0), shooter-selection weights.
3. Blockers, GK save resolution, vision-weighted assist selection.
4. `calcMatchXG`'s tactical multiplier chain, including the *gating* — build-up
   and runs only pay off if the squad's stats fit and the opponent's setup allows
   it. This gating is what makes their tactics matter; do not drop it.
5. `posFitFactor`/`oopFactor` over `POS_DEPTH`, applied to every stat
   aggregation, not just overall.
6. 7-type injury model with day-based recovery and potential loss.
7. Per-minute stamina/sharpness decay.

Store shot coordinates on `MatchEvent` so `PitchCanvas.tsx` can plot true
positions. Keep the existing tick loop and `ResumeContext` — this replaces the
resolution maths inside it, not the structure.

**Smoke test assertion**: goals/game in band; xG per shot never exceeds 1.0;
no NaN in any rating after a full season.

### Phase 5 — Tactics depth

Two new engine modules:
- `engine/familiarity.ts` — `tacFam` per club per style/formation, `styleKinship`
  via their `STYLE_SHAPE` vectors, `tickTacticalFamiliarity` weekly growth with
  diminishing returns, `weeksToDrill`, `coachDrillMult`, and `styleExec` gating
  with the `LEVEL_REQ_OFFSET` league-level allowances.
- `engine/setPieces.ts` — 5 corner routines, FK modes, per-job takers
  (`SP_JOBS`), box assignments both attacking and defending, zonal/man/mixed
  defence, `spExposure` and `spOutletBonus`.

`TacticsScreen.tsx` gains the custom formation builder
(`buildCustomFormation(counts)` generating positions and role labels from
arbitrary line counts), a set-piece tab, a familiarity readout showing
`weeksToDrill` before you commit to a switch, and the live `previewEffectiveXG`
number. Port their `rehearseSetPieces()` as a script under `scripts/`.

### Phase 6 — Match presentation

Penalties in open play, stoppage time, extra time, and the shootout overlay with
taker selection and ordering (their flow: pick 5 from the squad, dots row per
team, sudden death after 5). Two-legged aggregate line in the scoreboard driving
whether ET/pens are needed. SVG momentum graph fed by the spell-ownership model.
Half-time changes via `reSimFromMinute` — re-simulate the remainder with the new
tactics/talk while keeping events before the split minute. Replace the
`Math.random() < 0.5` in `engine/cups.ts`.

### Phase 7 — Transfers

New `engine/negotiation.ts`:

```ts
interface Negotiation {
  id: string; playerId: number; clubId: number;
  stage: 'fee' | 'wage' | 'agreed' | 'outbid' | 'failed';
  asking: number; minFee: number; wageDemand: number; minWage: number;
  feeRound: number; wageRound: number;
  holdOut: boolean; wageHoldOut: boolean; deadline: number;
}
```

Port `evaluateFeeOffer` (accept / counter / reject, walk after 3 rounds, the
one-time hold-out that then raises the price 12%), `askingMultiplier` by
availability status, `playerPrestige`/`assessMove`/`prestigeRejectChance` for
player agency, bidding wars and async deadline responses. Add `negotiations` to
`GameState`. Loans get the full clause set (wage share, playing-time clauses at
45%/22%, option to buy, recall) with `tickLoanClauses` weekly and an AI parent
that genuinely recalls. Release clauses, pre-contracts, bans, squad promises.
`TransfersScreen.tsx` gets the negotiation UI and the slider/tag filter bar.

**Smoke test assertion**: 20 seasons of AI transfer activity leaves every squad
within `MIN_SQUAD_SIZE`/`MAX_SQUAD_SIZE` and no negative balances that never
recover.

### Phase 8 — Finances

New `engine/finances.ts`. Three sponsor slots (shirt 1.00 / sleeve 0.22 / naming
rights 0.60) priced off their `sponsorMarketAnnual`, with clauses, renewal,
renegotiation and termination; separate kit deals; FFP 3-year rolling loss;
SCR = `(wages + amortization) / footballRevenue` with the 70% limit, embargo
after sustained breach, points deduction after ~8 weeks; `recordTransferExpense`
amortizing fees across contract length; board confidence, grants and funding
requests; the matchday income model (capacity × ticket tier × zone pricing ×
opponent × competition) with `previewMatchIncome`; parachute/TV/merch/Euro
income; granular expense lines. `FinancesScreen.tsx` gets the balance sparkline
with hover and the season breakdown table.

**Smoke test assertion**: an FFP breach produces an embargo then a deduction, and
the deduction is applied to the league table exactly once.

### Phase 9 — European competitions & awards

Swiss-model league phase (truncated round-robin giving each club a distinct
opponent set, Tuesdays, spaced from weekend fixtures) for UCL/UEL/UECL, the CL
qualifying play-off with losers dropping to the UEL, seeded knockout draws with
country protection, two-legged ties, `resumeStalledKO`. Graded board verdicts
(`sackScore = gapPenalty + (50 − confidence) ≥ 55`). Full award set with nominees
announced before winners, using the domestic-only mirror stats for national
awards.

### Phase 15 — Manager character designer

**Start here: it already exists.** `components/CharacterCustomizerScreen.tsx`
(399 lines) already builds a manager avatar from skin / eyes / hair / facial hair
/ accessories, reachable from `MainMenuScreen` as "Customize Manager". This phase
upgrades it against the reference build rather than writing a new screen.

Reference: `avatar-maker-seven.vercel.app`, unpacked from the uploaded zip to
a scratchpad dir (see the handoff note above). It is a minified CRA bundle —
read it for the *category model and layer order*, not for code to copy. Its
model: layered inline SVG, one `skinPrimary` + `skinShadowed` pair per skin tone
so shading stays correct across tones, and seven editable categories — skin
colour, hair (+ hair colour), eyebrows (+ colour), eyes, mouth, beard, clothing,
accessories — each rendered as a picker grid with a short description. It also
has **randomize** and **Download PNG / SVG**.

What to take from it:
1. **The `skinPrimary`/`skinShadowed` two-tone approach** — this is the one real
   idea in the reference. Shading currently breaks on dark skin tones in most
   naive avatar builders; a paired shadow colour per tone fixes it.
2. **Separate colour axes** — hair colour and eyebrow colour as their own
   controls, not baked into the style choice.
3. **Randomize** button, and **Download PNG** (canvas-render the SVG) so people
   can use the avatar off-site. Free marketing.
4. Category descriptions under each picker heading.

Answers to the four open questions in the brief, so they don't need re-asking:

- **Storage: in `GameState`, not Supabase, not a separate key.** Phase 0 already
  moves `managerProfile` out of its standalone localStorage key and into
  `GameState` so it travels with the save slot. Keep it there — the avatar is
  per-career, not per-device, and a manager who moves clubs should keep his face.
  Supabase adds an auth requirement for a cosmetic feature; the repo's Supabase
  MCP connection also isn't authorized in this environment.
- **Show it in-game: yes, but only where a person would be.** Manager avatar in
  the `PortalHub` club header, the press conference modal
  (`PressConferenceModal.tsx`), the dugout on the match screen, and the season
  review / job offer screens. Don't scatter it.
- **Gameplay effect: none. Cosmetic only.** Anything else means balancing
  appearance, which is a trap.
- **Player faces are a separate thing** — `components/PlayerFace.tsx` already
  exists and is generated from player data. Share the SVG layer primitives
  between it and the manager avatar, but keep manager customization manual and
  player faces derived.

Scope guard: this is a cosmetic side feature. It should be one commit, and it
must not block or gate the new-game flow — keep it optional from the main menu
exactly as it is today.

### Phases 10–14

Follow the descriptions in the phase list above; each is self-contained once its
dependencies (0, 1, 2) are in. Phase 12's odds model should read the engine's own
`previewEffectiveXG` rather than re-deriving strength, and must keep their fitted
constants (ρ = −0.28, λ scale 0.97, 5.2% overround, 70-entry fractional ladder).

### If you have to stop mid-phase

Write what landed and what is next into `.checkpoint.md` at the repo root — the
hourly build bot described in `CLAUDE.md` resumes from that file, and it is the
only state that survives a fresh session.

## Sequencing note

Phases are ordered by dependency, not by value. If time is short, the highest
user-visible return per unit of work is **Phase 3 (player modal)**, then
**Phase 7 (transfers)**, then **Phase 6 (penalties / extra time / shootouts)**.
Phase 0 is not optional — the current localStorage save is already at risk of
silent quota failure with 5,747 players, and every later phase makes the state
bigger.
