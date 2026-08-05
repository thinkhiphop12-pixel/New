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
- [x] Club Overview (`ClubScreen.tsx`) — hero ring (position + reputation) + form strip + budget card + quick stats
- [x] Finances (`FinancesScreen.tsx`) — income/expense bars, stadium attendance card, board confidence card
- [x] Stadium / Staff (`FacilitiesScreen.tsx`) — Stadium/Staff sub-tabs, per-stand upgrade cards
- [x] Stadium Expansion (`StadiumBuilder.tsx`) — per-stand breakdown cards grid (SVG kept)
- [x] Board Objectives (new view/tab) — BoardObjectivesScreen.tsx
- [x] Staff Profile (new detail view) — StaffProfileModal.tsx

## Phase 5 — App Shell utility screens
- [x] Inbox (`InboxScreen.tsx`) — `.fm-icon-tile` message rows + All/Unread/category filter strip
- [x] Message Detail — already its own view; formalized with the category icon-tile header
- [x] More Menu (new) — `MoreMenu.tsx`, opened from the app header
- [x] Settings (`SettingsPanel.tsx`) — grouped icon-tile rows, still a modal
- [x] Club Select (`ClubSelectScreen.tsx`) — crest-forward tile grid + settled header block
- [x] Match Preview — `match/MatchPreview.tsx`, pre-kick-off above the team sheet
- [x] Match Detail — events sheet restructured to scoreline banner + minute timeline
- [x] Match Menu / Pause — segmented speed + `.fm-menurow` icon-tile actions
- [x] Match Day Live chrome — scoreboard bar/ticker re-skinned off the spec's purple

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
- **Tactics' 6 sub-screens are in-page `.fm-subtab`s, not new nav entries** (per PLAN.md's
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
    the mock's per-player scouting-status dot: green ("assigned") when a scout assignment for
    this player has completed (via `sc.assignments` matching), dim grey ("pending") otherwise.
    Reflects whether scouts have been assigned to actively locate the player in transfers.
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

### Phase 3 — Code-quality & a11y fixes (PR #80)

After Phase 3 implementation, CodeRabbit and SonarCloud flagged code-quality issues. All fixed:
- **GroupHub button/flow-content violations (lines 163, 192)**: Changed outer element from `<button>` to `<div>` with onClick moved to nested header button only. Prevents invalid HTML nesting (button cannot wrap table/ul) and hydration mismatches.
- **TransfersScreen non-interactive div violations**: Converted 3 instances of `<div onClick>` to `<button type="button">` (shortlist row, outgoing negotiation row, received row header). Preserves nested interactive elements and transparent styling for seamless integration.
- **SquadScreen undefined role interpolation (line 104)**: Added guard `p.tacticalRole && getRole(p.tacticalRole)?.name ?` to prevent "· undefined" rendering when tactical role is not found.
- **CupScreen & EuropeanScreen penalty markers (lines 72-74, 154-156, 151-153)**: Fixed conditional logic so 'p' marker appears only on the side matching `t.pensWinnerId` (or latest leg's `pensWinnerId` for two-leg ties). Was always appending to away side regardless of winner.
- **TransfersScreen scouting-status dot (line 322)**: Changed data source from `scoutRecommendations(state)` (AI recommendations) to `sc.assignments` (actual scout assignments). Dot now shows based on whether scouts have been assigned to find the player, with full color for completed assignments and dim for pending.
- **TransfersScreen fm-ledger class rename (lines 642-650)**: All `.fm-ledger*` selectors renamed to `.fm-ledger-card*` to resolve duplicate selector conflict. Old `.fm-ledger` class (line 1128 in globals.css) stays for Finances list-style; new `.fm-ledger-card` for Negotiation/Transfers card-style.
- **globals.css Stylelint violation (line 2077)**: Added blank line between custom-property declarations (--ring-pct, --ring-color) and normal declarations (position, display) to satisfy `declaration-empty-line-before` rule.
- **TransfersScreen & TacticsScreen ARIA tabpanel roles**: Wrapped all 5 Transfer tab panels (hub, search, shortlist, sent, received) and all 6 Tactics sub-tab panels (formation, shape, defence, attack, Set Pieces, roles) with `role="tabpanel"` divs. Improves accessibility for tab navigation in screen readers.
- **TransfersScreen JSX structure (sent tab)**: Fixed duplicate closing div that was breaking fm-split nesting. Build now compiles successfully.
- All fixes verified: **Build compiles successfully** ✅

---

## Handover Notes — Phase 4 Implementation

### Summary

All Phase 4 (Club screens) items are marked complete. `tsc --noEmit` passes with zero
errors and `npm run build` succeeds. Below is what changed and how each screen maps to
the Phase 4 spec.

### Files modified

| File | Change |
|---|---|
| `src/games/football-manager/components/ClubScreen.tsx` | Restructured hero section into position ring + reputation stars + form strip; added Budget Overview panel (budget total, player wages, staff wages, gate income, capacity, squad size) reusing `.fm-qstat` quick-stat pattern from Phase 1 |
| `src/games/football-manager/components/FinancesScreen.tsx` | Restructured into Budget panel + Income/Expense bars + Stadium Attendance card + Board Confidence card + FFP/SCR status panel + Sponsorship + Ticket Pricing + Weekly Summary + Season Projection + Balance Trend + Season History + Recent Transactions |
| `src/games/football-manager/components/FacilitiesScreen.tsx` | Split into `StadiumTab` and `StaffTab` sub-tabs using `.fm-subnav__tabs`/`.fm-subtab` pattern; Stadium tab includes Club Facilities intro, Projects underway tracker, StadiumBuilder with stand-select, Training Ground, Medical Centre, Academy; Staff tab includes Named Coaches section with hire/release per role, Legacy Backroom Levels upgrades, and legacy stadium upgrade button; StaffProfileModal rendered when coach profile is clicked |
| `src/games/football-manager/components/StadiumBuilder.tsx` | Added per-stand card grid (`.fm-stand-grid` / `.fm-stand-card`) below the existing SVG pitch, showing each stand's tier, capacity, and upgrade button; SVG interaction unchanged |
| `src/games/football-manager/components/hubNav.ts` | Added `'board'` to `ScreenId` union and as a new screen in the `club` group |
| `src/games/football-manager/components/HubScreen.tsx` | Added `BoardObjectivesScreen` import and `case 'board'` routing |
| `src/games/football-manager/app/globals.css` | Phase 4 CSS classes already present from earlier phase (confirmed all used classes exist: `.fm-hero-rings`, `.fm-ring`, `.fm-form-strip`, `.fm-bar-row`, `.fm-cat-bar`, `.fm-qstat`, `.fm-ffp-row`, `.fm-staff-list`, `.fm-staff-row`, `.fm-stand-grid`, `.fm-stand-card`, `.fm-subnav__tabs`, `.fm-subtab`, `.fm-form-strip`, `.fm-form-dot`, etc.) |

### New files

- **`BoardObjectivesScreen.tsx`** — Board objective detail view showing:
  - Primary objective text + league position vs `minPosition` progress bar
  - Board confidence via `ReputationStars` + bar
  - Board metrics bars (Board confidence, Fan Confidence, Team Chemistry)
  - League context (current position, progress %)
  - Objective history table (SeasonSummary[] with objectiveMet status)
  - Dismissal risk warning (red/gold/green)
  - Uses `userLeagueId`, `userPosition`, `userLeague` from engine; `leagueName` from gameRules; `ReputationStars` from visuals
- **`StaffProfileModal.tsx`** — Staff detail modal with coach rating ring, role, quality, wage, negotiate/release buttons. Opens from FacilitiesScreen Staff tab coach rows.

### Key decisions

- **Board Objectives** implemented as a new `board` nav item in the Club group (per handover
  note "Can be a tab in ClubScreen or standalone view (TBD)"), not as a sub-tab inside
  ClubScreen — keeps it as a first-class destination and allows future expansion.
- **Staff Profile** implemented as a modal (`StaffProfileModal.tsx`) opened from the
  FacilitiesScreen Staff tab coach rows, reusing `PlayerModal.tsx`'s structural approach
  but tailored for coach data (quality rating ring, wage, role).
- **Income/Expense bars** in FinancesScreen use direct property access on
  `fin.seasonIncome` / `fin.seasonExpenses` for totals (avoiding type-indexing issues),
  with a `finVal()` helper using `as unknown as Record<string, number>` for the dynamic
  category lookup.
- **No fabricated data** — all values derive from real engine functions
  (`gateIncome`, `weeklyWageBill`, `staffWageBill`, `financesView`, `computeTable`,
  `userPosition`, `userLeagueId`, `totalCapacity`, etc.). The mock's "78%/22%
  budget allocation split" and "7-day daily schedule" patterns noted in Phase 3
  handover are not applicable; Phase 4 surfaces only data that exists in `GameState`.
- **Responsive tiers** follow the same three-tier model (Portrait <900px, Landscape
  900–1199px, Desktop ≥1200px) established in Phase 1/2. The income/expense bars use
  a CSS grid that collapses from 2-column to 1-column below 900px.
- **CSS palette** restricted to lime/green tokens (`--green`, `--green-600`, `--gold`).
  Red is used only for negative financial values (expenses, losses) as a conventional
  data-visualization color — no purple.

---

### Phase 5 — App Shell utility screens

- **New shared classes** (`app/globals.css`, "Phase 5 shared component classes"): `.fm-msg-list`/
  `.fm-msg-row` (icon-tile message rows), `.fm-setgroup` (titled section of settings rows) +
  `.fm-settings-row--stacked`/`.fm-settings-row__head`, `.fm-sheet-body`, `.fm-moregrid`/
  `.fm-moretile`, `.fm-preview`/`.fm-preview-facts` (crest-vs-crest banner, shared by Match
  Preview and Match Detail), `.fm-prekick`, `.fm-timeline` (minute rail), `.fm-menurow`, and the
  Club Select tile bits (`.fm-club-card__crest`/`__foot`/`__rating`/`__star`, `.fm-pick-head`).
  No Phase 0–4 class was removed or repurposed.

- **Inbox filter tabs are built from the messages that exist**, not from the full `InboxCategory`
  union — an empty "Youth" tab would read as a broken screen rather than an empty inbox. Tabs are
  All / Unread / one per category actually present, in `CATEGORY_LABEL` declaration order so the
  strip doesn't reshuffle as news arrives. Category tints come from the existing token set
  (`--green`/`--blue`/`--red`/`--gold`/`--green-600`/`--gold-2`/`--lime`/`--emerald`); the spec's
  purple is not in this game's palette.

- **Message Detail was already a separate view**, so this was a formalization rather than a split:
  the article head gained the same category icon-tile the list rows use. Prev/Next now walk the
  list you opened the message *from*, captured at open time (`navIds`) instead of recomputed —
  reading a message under the "Unread" filter drops it out of the live filtered list, which would
  otherwise strand the detail view the instant it marked itself read.

- **More Menu lives in the app header, replacing the bare "Settings" text button.** The spec's
  version is the overflow sheet for its flat 8-item dock; this game keeps the two-level group nav
  (decision 2), so there is no dock overflow to absorb. What it holds instead is the genuinely
  global set the rail never carried: Settings, Customize Manager, and Abandon Career — all three
  already existed, none was reachable from more than one screen. Settings is one tap deeper than
  before, which is the mock's own IA (Settings sits inside More there too). Outside a career
  (`state === null`) the sheet drops its career header and the Abandon tile.

- **Customizer return path fixed as part of wiring the More Menu.** `handleCharacterSave`/
  `handleCharacterBack` hard-coded `setView('menu')`, which was correct while the main menu was the
  only entrance; opening the customizer mid-career from the More Menu would have dumped the manager
  out of a live save. Now recorded in `characterReturn` when the customizer opens. This is view
  routing only — no engine state touched.

- **Club Select's "pick team later" was NOT built.** The engine has no unemployed/no-club state:
  `newGame` requires a `userClubId` and every screen reads `state.userClubId` unconditionally, so
  the affordance would either dead-end or need a fabricated club. The crest-tile grid half of the
  spec is fully implemented (crest-forward tiles with the real squad-rating chip and star player,
  and the manager-name/club-search/division controls gathered into one `.fm-pick-head` block).

- **Match Preview is the pre-kick-off state of `MatchScreen`, not a new route.** There is no
  separate pre-match screen in this game — `handlePlayMatch` goes straight to `view='match'`, which
  already rendered both XIs before kickoff. `MatchPreview.tsx` now sits above that team sheet with
  the crest-vs-crest banner, both sides' form (from played fixtures), each side's leading scorer
  (`Player.goals`) and the user's availability (`Player.injuryWeeks`). Every figure is real season
  state; nothing is invented to fill the layout.

- **Match Detail is the events sheet, restructured — not a view of a past fixture.** `Fixture`
  persists only `homeGoals`/`awayGoals`, so a minute-timeline for a finished league match would
  have to fabricate the events. The timeline is therefore attached to the live match's real
  `timeline.events`, with the scoreline banner reusing `.fm-preview` and goal/card/injury rows
  taking coloured markers.

- **Recent-form helper moved to `visuals.tsx`.** Match Preview needs form for *both* clubs, and
  `ClubScreen`'s local `clubForm` keyed off `userLeagueId`, which is wrong for an opponent in
  another division. The shared version reads each club's own `leagueId`; `ClubScreen` now imports
  it plus `FormChip` and dropped its duplicates (same dedupe pattern as Phase 4's `Bar`/
  `ordinalSuffix` move).

- **Purple leakage cleaned off the match screens** (decision 1, and verification step 4 — these are
  Phase 5's own screens): the pre-kick-off pitch (`.fm-ko__pitch`) was a purple gradient and is now
  the two greens `PitchCanvas` checkers the live pitch with, so the team sheet and the match agree;
  the scoreboard bar (`.fm-fmbar`) and commentary ticker (`.fm-fmticker`) went from purple to deep
  green; and `PitchCanvas`'s pitch-side ad boards went from purple/yellow to BALLKNW's own lime on
  deep green. Canvas drawing only — no sim logic touched. The `--accent-purple` Club-group tint
  decision 1 explicitly sanctions is untouched.

- **Pre-existing responsive bug fixed: `.fm-view-fade` needed `min-width: 0`.** It is the flex item
  inside `.fm-main` (a centred row flex), so its default `min-width: auto` refused to shrink below
  the min-content of whatever view it wrapped. Club Select's four league pills have
  `white-space: nowrap`, so at 390px the screen sized itself to 453px and — being centred —
  clipped at *both* edges instead of scrolling. Confirmed present before this phase's changes
  (measured 453px on the unmodified tree, 483px with the larger crest tiles). One line, and it
  fixes every `.fm-screen` view at narrow widths, not just Club Select.

- **`show2DPitch` deliberately has no Settings control.** It is declared in `GameSettings` and
  defaulted in `SettingsPanel`, but nothing in the codebase reads it — a switch that does nothing
  is worse than no switch.

- **Verification**: `tsc --noEmit` clean, `next build` clean, and every screen above driven in a
  real browser (Chromium/Playwright) at Desktop 1280×900 and Portrait 390×844 with no console or
  page errors. Match screens verified at Desktop; Portrait correctly shows the existing
  `RotatePrompt` for matches rather than rendering a squeezed pitch.
