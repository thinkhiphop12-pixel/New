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
- [ ] Squad (`SquadScreen.tsx`)
- [ ] Tactics (`TacticsScreen.tsx`) + Shape/Defence/Attack/Set Pieces/Player Roles sub-screens
- [ ] Training (`TrainingScreen.tsx`)
- [ ] Player Profile (`PlayerModal.tsx`)

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
