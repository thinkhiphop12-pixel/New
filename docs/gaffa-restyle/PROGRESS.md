# Gaffa restyle — progress checklist

See `PLAN.md` in this folder for full context. Update this file at the end of every phase,
committed alongside that phase's code changes.

## Phase 0 — Foundation
- [x] Shared component classes added to `app/globals.css` (`.fm-icon-tile`, `.fm-ring`,
      `.fm-ledger`, `.fm-segmented`, `.fm-bracket`)
- [x] Desktop (≥1200px) labeled-sidebar CSS variant of `.fm-rail` added (no JSX changes needed —
      existing `HubScreen.tsx` markup already supports it via media query)
- [x] Tracking docs created (this file + PLAN.md)

## Phase 1 — Hub & Matchday
- [x] Hub landing (`GroupHub.tsx`)
- [x] Fixtures (`FixturesScreen.tsx`)
- [x] Table (`TableScreen.tsx`)
- [x] Cups (`CupScreen.tsx`)
- [x] Europe (`EuropeanScreen.tsx`)
- [x] Overview (`PortalHub.tsx`) reconciled with Fixtures

## Phase 2 — Team
- [x] Squad (`SquadScreen.tsx`)
- [x] Tactics (`TacticsScreen.tsx`) + Shape/Defence/Attack/Set Pieces/Player Roles sub-screens
- [x] Training (`TrainingScreen.tsx`)
- [x] Player Profile (`PlayerModal.tsx`)

## Phase 3 — Market
- [ ] Transfers (`TransfersScreen.tsx`) restructured to 5-tab IA
- [ ] Scout (`ScoutScreen.tsx`) folded into Search/Shortlist
- [ ] Negotiation Detail restructured

## Phase 4 — Club
- [ ] Club Overview (`ClubScreen.tsx`)
- [ ] Finances (`FinancesScreen.tsx`)
- [ ] Stadium / Staff (`FacilitiesScreen.tsx`)
- [ ] Stadium Expansion (`StadiumBuilder.tsx`)
- [ ] Board Objectives (new view/tab)
- [ ] Staff Profile (new detail view)

## Phase 5 — App Shell utility screens
- [ ] Inbox (`InboxScreen.tsx`)
- [ ] Message Detail
- [ ] More Menu (new)
- [ ] Settings (`SettingsPanel.tsx`)
- [ ] Club Select (`ClubSelectScreen.tsx`)
- [ ] Match Preview
- [ ] Match Detail
- [ ] Match Menu / Pause
- [ ] Match Day Live chrome

## Phase 6 — Marketing & Onboarding
- [ ] Landing page polish pass
- [ ] Customize Manager (`CharacterCustomizerScreen.tsx`)

## Final cleanup
- [ ] Delete `docs/gaffa-restyle/` folder once all phases verified

## Decisions made during implementation (TBD items from the plan)

### Phase 1 — Hub & Matchday

- **Overview vs Fixtures "next match"**: both keep a next-match module, but with different
  jobs, not duplicated UI. `PortalHub.tsx` (Overview)'s hero stays the *actionable* version —
  lineup warning, Press Conference button, cup-week note — since that's the reason a player
  opens the hub at all. `FixturesScreen.tsx` gets a new plain, informational crest-vs-crest
  banner (mock's "next-match banner") leading straight into its results list, with no actions
  attached. Both read from the same `nextUserFixture(state)` so they can never disagree.
- **Hub landing "Calendar" module**: the mock's Calendar card is a day-by-day training/fixture
  calendar, which this game doesn't model — the sim's smallest unit is a week, not a day. Built
  a "Coming up" card instead (`GroupHub.tsx`'s `buildCalendar`) that looks ahead over real
  league/cup/continental schedule data (`leagueFixtures`, `knockoutRoundDue`,
  `continentalRoundDue`) rather than fabricating daily events. Added a `.fm-hub-top` grid
  wrapper so News + Stages(table) sit in one column and this card sits alongside it at
  ≥900px, matching the mock's two-/three-column split at Landscape/Desktop while staying a
  single stacked column under 900px (Portrait).
- **Europe "Standings" tab is a bracket, not a group table**: the mock's Europe screen assumes
  a real group stage (points, played, qualification zone). This game's `Continental` type is a
  genuine re-seeded knockout with no group phase (see its doc comment in `engine/types.ts`), so
  a "standings" table would mean fabricating data that doesn't exist. Restructured the tab to
  the same `.fm-bracket` round-columns treatment as `CupScreen.tsx` instead — an honest fit for
  the actual data model, and it reuses the Phase 0 shared bracket classes either way. The
  Fixtures tab's current tie was also restyled to the same crest-vs-crest banner pattern for
  visual consistency with `FixturesScreen.tsx`.
- **Cup/Europe bracket columns beyond the current round**: `Knockout`/`Continental` only carry
  tie data for rounds that have actually been drawn (the pairing is redrawn round-by-round, not
  a fixed bracket tree) — so future rounds have no real opponents to show. `CupScreen.tsx` and
  `EuropeanScreen.tsx` both render one column per total round (via `roundName`/
  `continentalRoundName`), filling undrawn rounds with "TBD vs TBD" placeholder tie cards, with
  the placeholder *count* per round estimated by halving the last known round's tie count
  (standard single-elimination shape) — a visual estimate, not real future pairing data.

### Phase 2 — Team

- **Squad's two rating-coded groups**: split by `Position` into "Goalkeepers & Defense"
  (`GK`+`DEF`) and "Midfield & Attack" (`MID`+`FWD`), matching the mock's grouping exactly. The
  mock's rating badge in this list is a rounded-square pill, not a circle, so it keeps reusing
  the existing `.fm-player-row__rating` badge rather than `.fm-ring` — `.fm-ring` is reserved for
  the screens where the mock actually shows a circular rating (Player Profile). No jersey-number
  field exists on `Player`, so the mock's numbered circle became the existing `PlayerFace` avatar
  instead of a fabricated squad number.
- **New shared class**: `.fm-split`, a responsive two-column grid (`--split-ratio` custom
  property, collapses to one column below 900px) added to `app/globals.css`. Used by Squad's two
  groups, Tactics' pitch+list/pitch+instructions panels, and Training's week-grid+condition
  panels — a pattern that recurred across all of Phase 2's screens but wasn't covered by Phase
  0/1's shared classes.
- **Tactics' 5 sub-screens are in-page `.fm-subtab`s, not new nav entries** (per PLAN.md's
  explicit judgement call): `TacticsScreen.tsx` now renders its own `role="tablist"` row —
  Formation / Shape / Defence / Attack / Set Pieces / Player Roles — above the content, reusing
  the same `.fm-subtab` pill class the top-level group nav uses. The existing accordion sections
  were redistributed rather than kept as a flat list:
  - **Formation** (default landing tab) = the pitch preview (IP/OOP toggle) + a new "Squad ·
    Role" list (the mock's right-hand panel, built from the real starting XI and each player's
    `tacticalRole`) + the existing IP/OOP/custom-formation pickers, no longer behind an accordion
    toggle since each sub-tab is now already a dedicated screen.
  - **Shape** = Mentality (existing cards, kept — richer than the mock's 4-option mentality) +
    Approach/Tempo/Width, each rewired onto the new `Segmented` helper component wrapping Phase
    0's `.fm-segmented` class. The mock's 4th Shape row, "Creative Freedom", has no engine
    equivalent and was **not** added — no fabricated tactical knob.
  - **Defence** = Pressing (relabeled "Defensive Line & Pressing" — this engine ties the two
    together as one setting, unlike the mock's separate sliders) as `.fm-segmented`, plus
    Defending Corners, plus a decorative pitch line whose height responds to the real pressing
    value. The mock's Tackling/Offside Trap/Time Wasting rows have no engine fields and were
    dropped rather than invented.
  - **Attack** = the existing Team Identity grid (play-style cards with familiarity/fit), with a
    line of copy explaining that this collapses the mock's granular passing-style/flank-focus
    instructions — this engine has no such knobs; Team Identity is the real attacking-approach
    lever it models instead.
  - **Set Pieces** = the existing corner-routine/corner-defense/takers UI, now paired with a
    small decorative pitch visual (reusing the same `.fm-slot`/`.fm-slot__chip` pitch-token
    classes as the Formation tab) showing the real assigned corner/free-kick/penalty takers as
    markers, closer to the mock's set-piece pitch view.
  - **Player Roles** = a new read-only summary grid (new `.fm-rolecard`/`.fm-rolecard-grid`
    classes) showing the captain (`state.captainId`) and the four dead-ball jobs. It's
    deliberately read-only: captaincy is appointed on `ClubScreen.tsx` (Phase 4 territory) and
    dead-ball takers are set on this screen's own Set Pieces tab — duplicating editable controls
    here would split one piece of state across two editors. The card copy says as much and points
    at both places.
- **Training's weekly grid stays honest to weekly-granularity data**: the engine's smallest time
  unit is a week (no per-day schedule exists — see the Phase 1 log above), so a literal 7-day
  mock schedule with distinct daily sessions would fabricate data. `TrainingScreen.tsx`'s new
  `.fm-weekgrid` shows the real single active `state.training` focus across Mon–Fri, a real
  Match Day/Free flag on Saturday from `nextUserFixture(state)` (which already checks
  `f.round === state.week`), and a fixed Rest day on Sunday — visually matches the mock's 7-tile
  grid without inventing daily variety the sim doesn't model. The Condition list reuses the real
  `player.fitness` field (already on `Player`, previously unsurfaced in this screen) through a
  new shared `.fm-meter-row` class. Existing Staff/best-worst-squad sections were kept below the
  new modules rather than removed — real functionality the mock doesn't cover but nothing in the
  brief called for deleting.
- **Player Profile's ring is additive, layered onto the existing avatar rather than replacing
  it**: `PlayerModal.tsx`'s `.fm-ring--lg` now wraps the existing club-coloured initials avatar
  (unchanged), with `--ring-pct` driven by `p.rating` and `--ring-color` banded on the same
  `--chip-vhigh/high/mid/low/bad` thresholds `attrBand` already uses for the attribute bars below
  it, so the ring and the bars read on one consistent scale. Everything else — attribute bars,
  the spider chart (kept, per the brief, as the supplementary detail view), traits, tactical-role
  picker, Stats tab — is untouched.
