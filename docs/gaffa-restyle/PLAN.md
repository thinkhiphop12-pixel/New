# Gaffa style-guide → full multi-phase restructure

> Working scratchpad for an in-progress restyle/restructure of `src/games/football-manager/`
> against a 5-file static HTML/CSS design spec ("Gaffa - App Shell / Hub & Matchday / Team /
> Market & Club / Marketing.dc.html"). Delete this whole `docs/gaffa-restyle/` folder once
> Phase 6 is complete and verified — it is not permanent documentation.

## Context

The design spec mocks up all 30 screens of the Gaffa football-manager game and describes
itself as the exact visual + interaction spec (layout, spacing, type scale, icon set, copy,
screen-to-screen flow) to be ported into the real component architecture — not a redesign to
guess at, but a source of truth to implement against, including real restructuring where the
mock's layout differs from what's live today.

The live game (`src/games/football-manager/`, Next.js 16 + React 19, hand-authored `.fm-*` BEM
classes on top of CSS custom properties in `app/globals.css`) already implements nearly every
one of the 30 mocked screens, under different names/IA. The task is to restyle **and**
restructure each to match the mock's layout while keeping the site's own visual identity.

## Decisions made (confirmed with the user)

1. **Brand color: keep lime/green**, not the mock's purple. `--lime:#2cb94e`, `--green:#b8ff3c`
   stay primary; `--accent-purple` stays a minor Club-only tint. Every pattern borrowed from the
   mock is re-skinned with existing lime/green tokens — no new color tokens added.
2. **Nav model: keep the 2-level group nav.** Hub landing → 4 group cards (Matchday/Team/Market/
   Club) → screens within each group, via `hubNav.ts`'s `GROUPS`. The mock's flat 8-item dock is
   NOT adopted structurally — but every screen's internal layout is restructured to match the
   mock.
3. **Transfer market: restructure to the mock's 5-tab flow** — Hub / Search / Shortlist /
   Offers Sent / Offers Received — replacing `TransfersScreen.tsx`'s current market/negotiations/
   incoming/squad/loans tabs. `ScoutScreen.tsx` folds into this (mirrors the mock's own audit
   resolving its "two competing transfer flows").
4. **Responsive: three real tiers.** Portrait (<900px, bottom dock), Landscape (900–1199px,
   compact 72px icon rail), Desktop (≥1200px, new wide labeled sidebar ~208px). All three are
   real, checked layouts per screen — not just fluid CSS.
5. **Scope: everything, phased** — all 30 screens across Phases 0–6 below.

## Shared foundation (Phase 0, blocks everything else)

- **Tokens**: reuse existing `app/globals.css` custom properties throughout. No new hex values.
- **New shared component classes** (added once in `globals.css`, `app/globals.css` bottom section
  "Gaffa restyle — Phase 0 shared component classes"):
  - `.fm-icon-tile` — rounded-square tinted-bg icon container (Inbox rows, More Menu, Settings,
    filter cards). Tint via `--tile-tint`.
  - `.fm-ring` — conic-gradient circular rating badge (Player Profile, Club Overview, budget
    ring). Value via `--ring-pct` (0–100), color via `--ring-color`.
  - `.fm-ledger` — 2-column "current vs offer" comparison row (Negotiation, Offers Sent).
  - `.fm-segmented` — equal-width option-pill row (Tactics sub-screens: defensive line, flank
    focus, mentality).
  - `.fm-bracket` — horizontally-scrolling round columns of tie cards (Cups knockout).
  - Pill-tab row: reuse existing `.fm-subtab`, extend rather than duplicate.
- **Icons**: reuse the existing `fmi-*` sprite in `Icon.tsx`. Only add new symbol defs for
  genuinely missing icons; never introduce a second icon system.
- **Nav shell** (`hubNav.ts`, `.fm-rail` CSS in `globals.css`, mounted in `HubScreen.tsx`):
  three-tier responsive pass. Portrait keeps the bottom dock. Landscape keeps the compact icon
  rail. Desktop (≥1200px) gets a new wider labeled-sidebar CSS variant of `.fm-rail` (same
  markup, `@media (min-width: 1200px)` block widens to 208px and switches item layout to
  icon+label side-by-side with a trailing badge) — done, no new component needed.

## Phases

### Phase 0 — Foundation (tokens, shared classes, nav shell) — DONE
Files: `app/globals.css`. No `hubNav.ts`/`Icon.tsx` changes needed (existing structure already
supported the desktop variant via CSS only). No visible screen-content changes beyond nav shell.

### Phase 1 — Hub & Matchday
Mirrors `Gaffa - Hub & Matchday.dc.html`.
- **Hub landing** (`GroupHub.tsx`): restructure toward mock's News-card + Stages(table)-preview +
  Calendar prominence, keeping the 4 group-card entry points.
- **Fixtures** (`FixturesScreen.tsx`): restructure to next-match banner + results list.
- **Table** (`TableScreen.tsx`): restructure to ranked-row-with-form-dots layout.
- **Cups** (`CupScreen.tsx`): restructure to bracket-rounds-as-columns (`.fm-bracket`).
- **Europe** (`EuropeanScreen.tsx`): restructure standings/fixtures tabs to mock's group-table
  treatment.
- **Overview** (`PortalHub.tsx`): reconcile against mock's Fixtures next-match banner — decide
  during implementation whether Overview absorbs that role or Fixtures owns it outright.

### Phase 2 — Team
Mirrors `Gaffa - Team.dc.html`.
- **Squad** (`SquadScreen.tsx`): two rating-coded position-group lists (GK/Defense, Mid/Attack)
  alongside existing pitch view.
- **Tactics** (`TacticsScreen.tsx`): pitch + squad-role split, plus dedicated Shape / Defence /
  Attack / Set Pieces / Player Roles sub-screens using `.fm-segmented`.
- **Training** (`TrainingScreen.tsx`): weekly session-icon grid + condition/fatigue list.
- **Player Profile** (`PlayerModal.tsx`): add `.fm-ring` + attribute-bar header; keep existing
  spider chart as a supplementary detail view (additive, not a replacement).

### Phase 3 — Market
Mirrors transfer-market sections of `Gaffa - Market & Club.dc.html`.
- **Transfers** (`TransfersScreen.tsx`): full restructure to 5-tab IA — Hub (budget ring +
  deadline countdown + scouting cards), Search (filter-tile cards + results), Shortlist
  (scouting-status dot), Offers Sent (`.fm-ledger`), Offers Received (Accept/Reject + optional
  desktop 3-panel review).
- **Scout** (`ScoutScreen.tsx`): fold scouting-assignment/shortlist functionality into
  Search/Shortlist tabs above; screen goes away as a separate nav entry.
- **Negotiation Detail**: restructure to deal-terms `.fm-ledger` + status panel.

### Phase 4 — Club
Mirrors club-management sections of `Gaffa - Market & Club.dc.html`.
- **Club Overview** (`ClubScreen.tsx`): league-position ring + reputation ring + recent-form
  strip.
- **Finances** (`FinancesScreen.tsx`): income/expenditure bars + attendance + board-confidence
  cards, keeping existing balance-trend chart.
- **Stadium / Staff** (`FacilitiesScreen.tsx`): facility-level bars + staff-roster rating rows.
- **Stadium Expansion** (`StadiumBuilder.tsx`): per-stand level/capacity/income cards, keeping
  existing SVG stand diagram as visual anchor.
- **Board Objectives**: new view (or tab within `ClubScreen.tsx`) — confidence stars + objectives
  by category.
- **Staff Profile**: new small detail view opened from Staff list.

### Phase 5 — App Shell utility screens
Mirrors `Gaffa - App Shell.dc.html`.
- **Inbox** (`InboxScreen.tsx`): `.fm-icon-tile` message rows + tab filter.
- **Message Detail**: formalize as its own view if not already separated from the list.
- **More Menu**: new icon-tile grid screen — decide trigger location (likely Club group or
  persistent affordance) during implementation.
- **Settings** (`SettingsPanel.tsx`): grouped icon-tile toggle rows, stays a modal.
- **Club Select** (`ClubSelectScreen.tsx`): crest-tile grid + "pick team later."
- **Match Preview**: crest-vs-crest banner + form dots + top scorer + availability chips.
- **Match Detail**: scoreline banner + minute-timeline with icon markers.
- **Match Menu / Pause**: mentality/speed shortcuts + key events + sim-to-FT + exit.
- **Match Day Live**: scoreboard bar with feed-progress dots + ticker headline as chrome only —
  never touch match-sim logic.

### Phase 6 — Marketing & Onboarding
Mirrors `Gaffa - Marketing.dc.html`.
- **Landing page**: polish pass toward mock's stat-strip/step-list conventions.
- **Customize Manager** (`CharacterCustomizerScreen.tsx`): split layout — avatar preview left,
  tabbed Personal Details/Appearance/Likes/Social Networks right.

## Verification (repeat per phase)

1. `cd src/games/football-manager && npm run dev`, navigate to every screen touched.
2. Check all three responsive tiers: ~390px (Portrait), ~900–1100px (Landscape), ≥1200px
   (Desktop) — each should read as deliberate, not squeezed/stretched.
3. Confirm no regressions to underlying game logic/state (badges, counts, form validity,
   negotiation state, match simulation) — chrome/layout changes only.
4. Visual check: lime/green stays the only accent; no purple leakage from copy-pasted mock
   styles; Phase 0 shared classes reused rather than redefined per screen.

See `PROGRESS.md` in this folder for the live checklist and implementation-time decision log.
