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
- [ ] Hub landing (`GroupHub.tsx`)
- [ ] Fixtures (`FixturesScreen.tsx`)
- [ ] Table (`TableScreen.tsx`)
- [ ] Cups (`CupScreen.tsx`)
- [ ] Europe (`EuropeanScreen.tsx`)
- [ ] Overview (`PortalHub.tsx`) reconciled with Fixtures

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

_(none yet — log calls here as they're made, e.g. Overview vs Fixtures owning "next match,"
spider chart vs rating-ring in Player Profile, where More Menu is triggered from)_
