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
- [x] Transfers (`TransfersScreen.tsx`) restructured to 5-tab IA
- [x] Scout (`ScoutScreen.tsx`) folded into Search/Shortlist
- [x] Negotiation Detail restructured

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

### Phase 3 — Market

- **`TransfersScreen.tsx` replaced its old market/negotiations/incoming/squad/loans tab set with
  the mock's 5-tab IA** — Hub / Search / Shortlist / Offers Sent / Offers Received, in a
  `.fm-subnav__tabs`/`.fm-subtab` row (the same in-page sub-tab pattern Phase 2's Tactics
  sub-screens established). Every button still calls the exact same `engine/transferMarket.ts` /
  `engine/facilities.ts` handlers as before (`openNegotiation`, `submitFeeOffer`,
  `submitTermsOffer`, `walkAwayNegotiation`, `acceptIncomingOffer`, `counterIncomingOffer`,
  `rejectIncomingOffer`, `dismissNegotiation`, `delistPlayer`, `listForSale`, `toggleLoanList`,
  `requestLoanIn`, `triggerReleaseClause`, `buyPlayer`/`canBuy`, `toggleShortlist`,
  `assignScout`) — this was a re-layout, not new game logic.
  - **Hub** = a new `TransferHub` sub-component: a `.fm-ring` + two stat cells (`TRANSFER` /
    `WAGES`) card, and a scouting-assignments card (both moved wholesale out of the old
    `ScoutScreen.tsx`), plus quick-link pills into the other four tabs. The mock's ring tracks a
    literal transfer-deadline day-count and a `78%/22%` budget-allocation split; neither exists
    in `GameState` (no separate transfer-window/deadline field, no wage-budget-vs-transfer-budget
    split — see `engine/types.ts`). Rather than invent one, the ring now tracks the real,
    honest analogue already in the sim: `state.week / SEASON_ROUNDS` (season-progress), with its
    center value showing real weeks remaining this season; the two stat cells show the real
    `state.budget` and `weeklyWageBill(state)` (an already-existing engine function, previously
    unsurfaced here) instead of a fabricated wages-budget figure.
  - **Search** = the old "Market" tab's player list, but its filter row became four
    `.fm-filtercard` icon-tile cards (Position / Nationality / Status / Age) matching the mock's
    grid, each holding a `<select>`. Position and Status map straight onto the existing
    `MarketFilters.pos`/`.avail` engine filters; Nationality and Age have no server-side filter
    param in `getTransferMarket`, so they filter the already-fetched result client-side (Age
    reuses the same 21/24/28/40 bands `ScoutScreen.tsx` used for its leads; Nationality is
    populated from the nations actually present in this week's market, not a fabricated list).
    Each row also gained a Shortlist/Shortlisted toggle (`toggleShortlist`) so shortlisting no
    longer requires a separate screen. The old Market tab's Loan Market and My Squad
    list/list-for-sale/loan-list sections were kept underneath Search's results (real
    functionality with no home anywhere else in the new 5-tab set — the mock doesn't cover
    them, but nothing in the brief called for deleting them).
  - **Shortlist** = `ScoutScreen.tsx`'s persisted `state.scouting.shortlist` list (via
    `transferTargets`/shortlist merge, byte-for-byte the same logic that screen used), now with
    the mock's per-player scouting-status dot: green ("scouted") when the player already appears
    in `scoutRecommendations(state)`'s picks (a completed lead), dim grey ("report pending")
    otherwise — an honest proxy for "has scouting coverage" since there's no separate per-player
    scouting-completeness field on `Player`.
  - **Offers Sent** = outgoing negotiations list (left) + a `.fm-ledger` card (right, `.fm-split`
    at ≥900px) showing the selected deal's Fee/Wage/Contract rows as current-vs-offer, reusing
    `Negotiation.neg.asking`/`.wageDemand` for "current" and `.lastFee`/`.lastWage`/
    `.contractYears` for "offer" — both already-existing fields, no new state. The interactive
    fee/terms form and message transcript (`NegotiationPanel`, unchanged logic) sits below the
    ledger, since a live negotiation is a back-and-forth the mock's static ledger card doesn't
    fully model — the ledger is a summary header, not a replacement for the real turn-based form.
  - **Offers Received** = incoming negotiations as `.fm-received-row` cards (bid summary +
    rival-bid note + Accept/Counter/Reject), replacing the old flat `.fm-player-row` list —
    same handlers (`acceptIncomingOffer`, `counterIncomingOffer`, `rejectIncomingOffer`,
    `dismissNegotiation`). The mock's optional desktop-only 3-panel "Full Review Desk" (offer
    list / negotiation actions / player detail panels, plus a "Delegate to Staff"/"View Swap
    Player" action set) was **not** built — those two actions have no engine equivalent
    (no delegate-to-staff flow, no swap-player-in-a-deal mechanic), and duplicating a whole
    second desktop-only layout for the same data the simpler list already presents cleanly
    across all three tiers wasn't judged worth the added surface for this pass.
  - **Negotiation Detail**: there wasn't a separate standalone route for this — the mock's
    "11. Negotiation Detail" screen is exactly what `TransfersScreen.tsx`'s existing
    `NegotiationPanel` already was (opened from Search via "Guide £Xm" or from the Offers Sent
    list). It's now restructured with the `.fm-ledger` deal-terms card described above (Offers
    Sent bullet) plus the unchanged log/status/action-form beneath it, and is shared by both the
    Search→talks flow and the Offers Sent tab rather than being two separate implementations.
- **`ScoutScreen.tsx` deleted.** Its three pieces of real functionality all moved into
  `TransfersScreen.tsx` rather than being cut: the scouting-assignment cards + assign/opponent
  dropdown + opponent-reports list → Hub tab; the position-grouped leads list with
  rating/age filters → folded into Search (Position/Age filter cards + Shortlist toggle
  replace the old per-position accordion); the persisted shortlist with Drop/Sign actions →
  Shortlist tab. No `engine/*` scouting or shortlist logic was touched — `engine/facilities.ts`
  (`assignScout`, `newScouting`, `tickFacilitiesWeek`, `toggleShortlist`) and
  `engine/transferMarket.ts` (`scoutRecommendations`, `transferTargets`, `askingPrice`,
  `buyPlayer`, `canBuy`) are called exactly as before, just from the new screen.
- **Nav**: `hubNav.ts`'s `market` group's `screens` array drops the `scout` entry (now just
  `[transfers]`), and its `ScreenId` union drops `'scout'`. `HubScreen.tsx` drops the
  `ScoutScreen` import and its `case 'scout'` switch arm. `screenBadge`/`groupBadge` needed no
  changes — they never keyed off `'scout'` to begin with (only `transfers`/`inbox`/`tactics`
  carry badges). The `scout` `IconName` variant in `Icon.tsx` was left in place — it's still used
  by `FacilitiesScreen.tsx`'s staff-role icons, an unrelated Phase 4 screen.
