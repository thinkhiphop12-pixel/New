'use strict';

/* ============================================================
   7-0-0 — World Cup squad builder
   Engine ported from 38-0-0 (club edition), adapted for:
   - 11-round draft, player-chosen formation. Each player/icon has a broad
     family (GK/DF/MF/FW, from the data) plus an inferred specific position
     (sp/sp2: GK, LB, RB, CB, LM, RM, CM, LW, RW, ST) derived from their
     stat profile — versatile profiles near the central/wide boundary get
     2 eligible positions, specialists get 1, matching real squad mixes.
   - Weighted Country|Year spin (squad_weights) instead of club+season
   - Icon take-or-skip offers (capped)
   - 7-game World Cup record (3 group + R16 + QF + SF + Final) as the
     decoupled outcome stat — independent of the 11 draft rounds, exactly
     as 38-0-0 decouples its 11 XI picks from its 38-game season record.
   ============================================================ */

const $ = (id) => document.getElementById(id);

let DATA = null;
let SQUADS = null;        // built client-side: "Country|Year" -> [players]
let COMBOS = [];          // ["Country|Year", ...]
let WEIGHTS = [];         // parallel weights array

const TOTAL_ROUNDS = 11;  // draft picks = XI size, fixed by formation
const GAMES = 7;          // simulated World Cup record length (the "7" in 7-0-0)

let ICON_PROB = 0.11;
let MAX_ICON_HITS = 2;
let OPP_BASELINE = 72;

/* ---------------- Formations (slot labels = specific positions: GK/LB/RB/CB/CM/RM/LM/ST/RW/LW) ---------------- */
const FORMATIONS = {
  '4-3-3': { slots: [
    { id:'gk',  label:'GK',  fam:'GK', x:50, y:92 },
    { id:'df1', label:'RB',  fam:'DF', x:82, y:74 },
    { id:'df2', label:'CB',  fam:'DF', x:62, y:78 },
    { id:'df3', label:'CB',  fam:'DF', x:38, y:78 },
    { id:'df4', label:'LB',  fam:'DF', x:18, y:74 },
    { id:'mf1', label:'CM',  fam:'MF', x:68, y:54 },
    { id:'mf2', label:'CM',  fam:'MF', x:50, y:58 },
    { id:'mf3', label:'CM',  fam:'MF', x:32, y:54 },
    { id:'fw1', label:'RW',  fam:'FW', x:78, y:24 },
    { id:'fw2', label:'ST',  fam:'FW', x:50, y:16 },
    { id:'fw3', label:'LW',  fam:'FW', x:22, y:24 },
  ]},
  '4-4-2': { slots: [
    { id:'gk',  label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'RB', fam:'DF', x:82, y:74 },
    { id:'df2', label:'CB', fam:'DF', x:62, y:78 },
    { id:'df3', label:'CB', fam:'DF', x:38, y:78 },
    { id:'df4', label:'LB', fam:'DF', x:18, y:74 },
    { id:'mf1', label:'RM', fam:'MF', x:82, y:50 },
    { id:'mf2', label:'CM', fam:'MF', x:60, y:54 },
    { id:'mf3', label:'CM', fam:'MF', x:40, y:54 },
    { id:'mf4', label:'LM', fam:'MF', x:18, y:50 },
    { id:'fw1', label:'ST', fam:'FW', x:62, y:18 },
    { id:'fw2', label:'ST', fam:'FW', x:38, y:18 },
  ]},
  '4-2-4': { slots: [
    { id:'gk',  label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'RB', fam:'DF', x:82, y:76 },
    { id:'df2', label:'CB', fam:'DF', x:62, y:80 },
    { id:'df3', label:'CB', fam:'DF', x:38, y:80 },
    { id:'df4', label:'LB', fam:'DF', x:18, y:76 },
    { id:'mf1', label:'CM', fam:'MF', x:64, y:54 },
    { id:'mf2', label:'CM', fam:'MF', x:36, y:54 },
    { id:'fw1', label:'RW', fam:'FW', x:84, y:22 },
    { id:'fw2', label:'ST', fam:'FW', x:60, y:14 },
    { id:'fw3', label:'ST', fam:'FW', x:40, y:14 },
    { id:'fw4', label:'LW', fam:'FW', x:16, y:22 },
  ]},
  '3-4-3': { slots: [
    { id:'gk',  label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'CB', fam:'DF', x:72, y:78 },
    { id:'df2', label:'CB', fam:'DF', x:50, y:82 },
    { id:'df3', label:'CB', fam:'DF', x:28, y:78 },
    { id:'mf1', label:'RM', fam:'MF', x:84, y:52 },
    { id:'mf2', label:'CM', fam:'MF', x:60, y:56 },
    { id:'mf3', label:'CM', fam:'MF', x:40, y:56 },
    { id:'mf4', label:'LM', fam:'MF', x:16, y:52 },
    { id:'fw1', label:'RW', fam:'FW', x:78, y:22 },
    { id:'fw2', label:'ST', fam:'FW', x:50, y:14 },
    { id:'fw3', label:'LW', fam:'FW', x:22, y:22 },
  ]},
  '3-5-2': { slots: [
    { id:'gk',  label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'CB', fam:'DF', x:72, y:78 },
    { id:'df2', label:'CB', fam:'DF', x:50, y:82 },
    { id:'df3', label:'CB', fam:'DF', x:28, y:78 },
    { id:'mf1', label:'RM', fam:'MF', x:88, y:54 },
    { id:'mf2', label:'CM', fam:'MF', x:64, y:58 },
    { id:'mf3', label:'CM', fam:'MF', x:50, y:50 },
    { id:'mf4', label:'CM', fam:'MF', x:36, y:58 },
    { id:'mf5', label:'LM', fam:'MF', x:12, y:54 },
    { id:'fw1', label:'ST', fam:'FW', x:62, y:18 },
    { id:'fw2', label:'ST', fam:'FW', x:38, y:18 },
  ]},
  '5-3-2': { slots: [
    { id:'gk',  label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'RB', fam:'DF', x:88, y:76 },
    { id:'df2', label:'CB', fam:'DF', x:68, y:80 },
    { id:'df3', label:'CB', fam:'DF', x:50, y:84 },
    { id:'df4', label:'CB', fam:'DF', x:32, y:80 },
    { id:'df5', label:'LB', fam:'DF', x:12, y:76 },
    { id:'mf1', label:'CM', fam:'MF', x:68, y:54 },
    { id:'mf2', label:'CM', fam:'MF', x:50, y:58 },
    { id:'mf3', label:'CM', fam:'MF', x:32, y:54 },
    { id:'fw1', label:'ST', fam:'FW', x:62, y:18 },
    { id:'fw2', label:'ST', fam:'FW', x:38, y:18 },
  ]},
  '5-4-1': { slots: [
    { id:'gk',  label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'RB', fam:'DF', x:88, y:76 },
    { id:'df2', label:'CB', fam:'DF', x:68, y:80 },
    { id:'df3', label:'CB', fam:'DF', x:50, y:84 },
    { id:'df4', label:'CB', fam:'DF', x:32, y:80 },
    { id:'df5', label:'LB', fam:'DF', x:12, y:76 },
    { id:'mf1', label:'RM', fam:'MF', x:84, y:52 },
    { id:'mf2', label:'CM', fam:'MF', x:60, y:56 },
    { id:'mf3', label:'CM', fam:'MF', x:40, y:56 },
    { id:'mf4', label:'LM', fam:'MF', x:16, y:52 },
    { id:'fw1', label:'ST', fam:'FW', x:50, y:16 },
  ]},
};

let SLOTS = [];

/* ---------------- Flags ---------------- */
const ISO = {
  Algeria:'DZ', Argentina:'AR', Australia:'AU', Austria:'AT', Belgium:'BE',
  Bosnia:'BA', 'Bosnia and Herzegovina':'BA', Brazil:'BR', Cameroon:'CM',
  Canada:'CA', 'Cape Verde':'CV', Chile:'CL', Colombia:'CO', 'Costa Rica':'CR',
  Croatia:'HR', Curacao:'CW', 'Czech Republic':'CZ', 'DR Congo':'CD',
  Denmark:'DK', Ecuador:'EC', Egypt:'EG', England:'GB-ENG', France:'FR',
  Germany:'DE', Ghana:'GH', Greece:'GR', Haiti:'HT', Honduras:'HN',
  Iceland:'IS', Iran:'IR', Iraq:'IQ', Italy:'IT', 'Ivory Coast':'CI',
  Japan:'JP', Jordan:'JO', Mexico:'MX', Morocco:'MA', Netherlands:'NL',
  'New Zealand':'NZ', Nigeria:'NG', Norway:'NO', Panama:'PA', Paraguay:'PY',
  Peru:'PE', Poland:'PL', Portugal:'PT', Qatar:'QA', 'Republic of Ireland':'IE',
  Russia:'RU', 'Saudi Arabia':'SA', Scotland:'GB-SCT', Senegal:'SN', Serbia:'RS',
  Slovakia:'SK', 'South Africa':'ZA', 'South Korea':'KR', Spain:'ES',
  Sweden:'SE', Switzerland:'CH', Tunisia:'TN', Turkey:'TR', USA:'US',
  Ukraine:'UA', Uruguay:'UY', Uzbekistan:'UZ', Wales:'GB-WLS',
};
function flagEmoji(country){
  const code = ISO[country];
  if (!code || code.includes('-')) return '\u{1F3F3}\u{FE0F}'; // white flag fallback for home-nations codes
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
function strHash(s){ let h=0; for (let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))|0; } return Math.abs(h); }
const PALETTE = ['#1b5e3a','#0b3d91','#b22222','#d4a017','#2e2e6e','#7a1f3d','#1c6e5c','#8c5a1f'];
function colorFor(country){
  const h = strHash(country);
  return [PALETTE[h % PALETTE.length], '#f4efe0'];
}
function ovrTier(o){
  if (o >= 85) return 'tier-elite';
  if (o >= 75) return 'tier-great';
  if (o >= 65) return 'tier-good';
  return 'tier-avg';
}

/* ---------------- helpers ---------------- */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function initials(name){
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}
function toast(msg){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(), 300); }, 2200);
}

/* ---------------- analytics (stub-safe) ---------------- */
function track(event, props){
  try { if (window.posthog) window.posthog.capture(event, props || {}); } catch(e){}
}

/* ---------------- state ---------------- */
let state = null;
let setupMode = null;
let setupFormation = null;

/* ---------------- boot ---------------- */
async function boot(){
  try {
    const res = await fetch('data.json?v=1');
    DATA = await res.json();
  } catch (e) {
    $('app').innerHTML = '<div class="loadError">Could not load data.json — serve this folder over HTTP (not file://) and try again.</div>';
    return;
  }

  ICON_PROB = DATA.meta.icon_prob ?? ICON_PROB;
  MAX_ICON_HITS = DATA.meta.max_icon_hits ?? MAX_ICON_HITS;
  OPP_BASELINE = DATA.meta.opp_baseline ?? OPP_BASELINE;

  SQUADS = {};
  for (const p of DATA.players) {
    const key = `${p.country}|${p.year}`;
    (SQUADS[key] ||= []).push(p);
  }
  COMBOS = Object.keys(DATA.squad_weights);
  WEIGHTS = COMBOS.map(k => DATA.squad_weights[k]);

  buildFormationGrid();
  wireSetup();
  wireGameScreen();
  wireResultsScreen();
  showSetup();
}

/* ---------------- setup screen ---------------- */
function buildFormationGrid(){
  const grid = $('formationGrid');
  grid.innerHTML = '';
  Object.keys(FORMATIONS).forEach(key => {
    const b = document.createElement('button');
    b.className = 'formation-card';
    b.dataset.formation = key;
    b.innerHTML = `<span class="f-shape">${key}</span>`;
    b.addEventListener('click', () => {
      setupFormation = key;
      document.querySelectorAll('.formation-card').forEach(c => c.classList.remove('sel'));
      b.classList.add('sel');
      maybeShowStart();
    });
    grid.appendChild(b);
  });
}

function wireSetup(){
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      setupMode = card.dataset.mode;
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      maybeShowStart();
    });
  });
  $('setupStart').addEventListener('click', () => {
    if (setupMode && setupFormation) startGame(setupMode, setupFormation);
  });
  $('resetBtn').addEventListener('click', () => {
    if (confirm('Abandon this squad and start over?')) showSetup();
  });
}

function maybeShowStart(){
  $('setupStart').disabled = !(setupMode && setupFormation);
}

function showSetup(){
  state = null;
  setupMode = null;
  setupFormation = null;
  document.querySelectorAll('.mode-card, .formation-card').forEach(c => c.classList.remove('sel'));
  $('setupStart').disabled = true;
  $('setupScreen').classList.remove('hidden');
  $('gameScreen').classList.add('hidden');
  $('resultsScreen').classList.add('hidden');
  $('roundPill').textContent = '';
}

/* ---------------- game start ---------------- */
function startGame(mode, formationKey){
  SLOTS = FORMATIONS[formationKey].slots;
  state = {
    round: 1,
    picks: {},
    iconHitsThisGame: 0,
    mode,
    expert: mode === 'expert',
    formation: formationKey,
    pendingIcon: null,
    spinning: false,
    sortByRating: false,
  };
  $('setupScreen').classList.add('hidden');
  $('resultsScreen').classList.add('hidden');
  $('gameScreen').classList.remove('hidden');
  $('formationTag').textContent = formationKey;
  buildPitch();
  updateRoundPill();
  updateSortBtn();
  $('draftPane').classList.add('hidden');
  $('spinPane').classList.remove('hidden');
  $('iconOffer').classList.add('hidden');
}

function countPicks(){ return Object.keys(state.picks).length; }
function updateRoundPill(){ $('roundPill').textContent = `Pick ${countPicks()+1} / ${TOTAL_ROUNDS}`; }

/* ---------------- pitch ---------------- */
function buildPitch(){
  const pitch = $('pitch');
  pitch.querySelectorAll('.slot').forEach(n => n.remove());
  SLOTS.forEach(slot => {
    const node = document.createElement('div');
    node.className = 'slot open';
    node.style.left = slot.x + '%';
    node.style.top = slot.y + '%';
    node.dataset.slotId = slot.id;
    node.innerHTML = `<div class="slot-label">${slot.label}</div>`;
    node.addEventListener('click', () => onSlotClick(slot.id));
    pitch.appendChild(node);
  });
  refreshPitch();
}

function slotById(id){ return SLOTS.find(s => s.id === id); }
function openSlotsForPlayer(player){ return SLOTS.filter(s => !state.picks[s.id] && player.sp2.includes(s.label)); }
function openSlots(){ return SLOTS.filter(s => !state.picks[s.id]); }

function refreshPitch(){
  SLOTS.forEach(slot => {
    const node = $('pitch').querySelector(`[data-slot-id="${slot.id}"]`);
    if (!node) return;
    const pick = state.picks[slot.id];
    if (pick) {
      node.className = 'slot filled';
      const [shirt] = colorFor(pick.country);
      node.style.setProperty('--shirt', shirt);
      node.innerHTML = `
        <div class="slot-jersey" style="background:${shirt}">${initials(pick.player.n)}</div>
        <div class="slot-ovr">${pick.player.o}</div>
        <div class="slot-name">${pick.player.n.split(' ').pop()}</div>`;
    } else {
      node.className = 'slot open';
      node.innerHTML = `<div class="slot-label">${slot.label}</div>`;
    }
  });
}

function onSlotClick(slotId){
  // Clicking an open slot just highlights it as the active target during a draft offer.
  if (!state.activeDraft) return;
  const slot = slotById(slotId);
  if (state.picks[slot.id]) return;
  if (!state.activeDraft.player.sp2.includes(slot.label)) { toast(`Doesn't fit ${slot.label}`); return; }
  confirmPick(slot.id, state.activeDraft.player, state.activeDraft.country, state.activeDraft.year);
}

function confirmPick(slotId, player, country, year){
  state.picks[slotId] = { player, country, year, slotId };
  state.activeDraft = null;
  if (navigator.vibrate) navigator.vibrate(10);
  refreshPitch();
  updateRoundPill();
  $('draftPane').classList.add('hidden');
  $('spinPane').classList.remove('hidden');
  if (countPicks() >= TOTAL_ROUNDS) {
    showResults();
  } else {
    state.round++;
  }
}

/* ---------------- spin ---------------- */
function wireGameScreen(){
  $('spinBtn').addEventListener('click', () => spin());
  $('draftSearch').addEventListener('input', (e) => renderPlayerList(e.target.value));
  $('iconTakeBtn').addEventListener('click', takeIcon);
  $('iconSkipBtn').addEventListener('click', skipIcon);
  $('draftSortBtn').addEventListener('click', () => {
    state.sortByRating = !state.sortByRating;
    updateSortBtn();
    renderPlayerList($('draftSearch').value);
  });
}

function updateSortBtn(){
  $('draftSortBtn').textContent = state.sortByRating ? 'Best first ▾' : 'Squad order ▾';
  $('draftSortBtn').classList.toggle('active', state.sortByRating);
}

function weightedCombo(){
  let total = 0;
  for (const w of WEIGHTS) total += w;
  let r = Math.random() * total;
  for (let i = 0; i < COMBOS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return COMBOS[i];
  }
  return COMBOS[COMBOS.length - 1];
}

function eligibleIcons(){
  const openLabels = new Set(openSlots().map(s => s.label));
  return DATA.icons.filter(ic => ic.sp2.some(label => openLabels.has(label)));
}

function spin(){
  if (state.spinning) return;
  state.spinning = true;
  $('spinBtn').disabled = true;

  const tryIcon = Math.random() < ICON_PROB && state.iconHitsThisGame < MAX_ICON_HITS;
  const pool = tryIcon ? eligibleIcons() : [];
  const isIconOffer = tryIcon && pool.length > 0;

  let ticks = 0;
  const maxTicks = 22 + Math.floor(Math.random()*8);
  const reelA = $('reelCountry'), reelB = $('reelYear');
  const tickInterval = setInterval(() => {
    ticks++;
    const combo = weightedCombo().split('|');
    reelA.textContent = isIconOffer ? '⭐ ICON' : combo[0];
    reelB.textContent = isIconOffer ? 'OFFER' : combo[1];
    if (ticks >= maxTicks) {
      clearInterval(tickInterval);
      settleSpin(isIconOffer, pool);
    }
  }, 55);
}

function settleSpin(isIconOffer, iconPool){
  state.spinning = false;
  $('spinBtn').disabled = false;
  if (isIconOffer) {
    const icon = iconPool[Math.floor(Math.random()*iconPool.length)];
    $('reelCountry').textContent = '⭐ ICON';
    $('reelYear').textContent = 'OFFER';
    track('icon_offer', { name: icon.n });
    openIconOffer(icon);
  } else {
    const comboKey = weightedCombo();
    const [country, year] = comboKey.split('|');
    $('reelCountry').textContent = country;
    $('reelYear').textContent = year;
    track('spin', { country, year });
    openDraft(country, year);
  }
}

/* ---------------- icon offer ---------------- */
function openIconOffer(icon){
  state.pendingIcon = icon;
  $('spinPane').classList.add('hidden');
  $('iconOffer').classList.remove('hidden');
  const [shirt] = colorFor(icon.country);
  $('iconCardName').textContent = icon.n;
  $('iconCardMeta').textContent = `${icon.country} · ${icon.sp2.join('/')}`;
  $('iconCardJersey').style.background = shirt;
  $('iconCardJersey').textContent = initials(icon.n);
  $('iconCardOvr').textContent = icon.o;
  $('iconCardOvr').className = `icon-card-ovr ${ovrTier(icon.o)}`;
  $('iconStats').innerHTML = ['pac','sho','pas','dri','def','phy'].map(k =>
    `<div class="istat"><span>${k.toUpperCase()}</span><b>${icon.o ? icon[k] : '–'}</b></div>`).join('');
}

function takeIcon(){
  const icon = state.pendingIcon;
  const slots = openSlotsForPlayer(icon);
  if (slots.length === 0) { toast('No open slot for this icon'); return; }
  state.iconHitsThisGame++;
  $('iconOffer').classList.add('hidden');
  if (slots.length === 1) {
    confirmPick(slots[0].id, icon, icon.country, 'ICON');
  } else {
    state.activeDraft = { player: icon, country: icon.country, year: 'ICON' };
    $('draftPane').classList.remove('hidden');
    $('draftTeamName').textContent = icon.n;
    $('draftYear').textContent = 'Pick a slot on the pitch';
    $('playerList').innerHTML = '';
    $('draftSearch').value = '';
    toast('Tap a highlighted slot to place your icon');
  }
  track('icon_take', { name: icon.n });
}

function skipIcon(){
  track('icon_skip', { name: state.pendingIcon?.n });
  state.pendingIcon = null;
  $('iconOffer').classList.add('hidden');
  $('spinPane').classList.remove('hidden');
}

/* ---------------- draft ---------------- */
function openDraft(country, year){
  const key = `${country}|${year}`;
  const squad = SQUADS[key] || [];
  state.activeSquad = squad;
  $('spinPane').classList.add('hidden');
  $('draftPane').classList.remove('hidden');
  $('draftTeamName').innerHTML = `${flagEmoji(country)} ${country}`;
  $('draftYear').textContent = `${year} squad`;
  $('draftSearch').value = '';
  updateInstruct();
  renderPlayerList('');

  const anyPlayable = squad.some(p => openSlotsForPlayer(p).length > 0);
  if (!anyPlayable) {
    toast('No room for this squad — re-spinning');
    setTimeout(() => spin(), 500);
  }
}

function updateInstruct(){
  const open = openSlots().map(s => s.label).join(', ');
  $('draftInstruct').textContent = `Open: ${open}`;
}

function isUsedPlayer(p){
  return Object.values(state.picks).some(pick => pick.player === p);
}

function renderPlayerList(filter){
  const squad = state.activeSquad || [];
  const f = (filter || '').trim().toLowerCase();
  let list = squad.filter(p => !f || p.n.toLowerCase().includes(f));
  if (state.sortByRating) {
    list = [...list].sort((a,b) => b.o - a.o);
  } else if (state.expert) {
    const order = { GK:0, DF:1, MF:2, FW:3 };
    list = [...list].sort((a,b) => order[a.p[0]] - order[b.p[0]]);
  }
  const wrap = $('playerList');
  wrap.innerHTML = '';
  list.forEach(p => {
    const used = isUsedPlayer(p);
    const fits = openSlotsForPlayer(p).length > 0;
    const ineligible = used || !fits;
    const row = document.createElement('div');
    row.className = 'player-row' + (ineligible ? ' ineligible' : '');
    const [shirt] = colorFor(p.country);
    const ovrBadge = state.expert ? '' : `<span class="p-ovr-badge ${ovrTier(p.o)}">${p.o}</span>`;
    const statsGrid = state.expert ? '' : `<div class="p-stats-grid">${['pac','sho','pas','dri','def','phy'].map(k=>`<div class="pstat"><span>${k.toUpperCase()}</span><b>${p[k]}</b></div>`).join('')}</div>`;
    row.innerHTML = `
      <div class="p-jersey" style="background:${shirt}">${initials(p.n)}</div>
      <div class="p-info">
        <div class="p-top">
          <span class="p-name">${p.n}</span>
          ${ovrBadge}
        </div>
        <div class="p-meta">${p.sp2.join('/')}${used ? ' · used' : ''}</div>
        ${statsGrid}
      </div>`;
    if (!ineligible) row.addEventListener('click', () => draftPick(p));
    wrap.appendChild(row);
  });
}

function draftPick(player){
  const slots = openSlotsForPlayer(player);
  if (slots.length === 0) return;
  if (slots.length === 1) {
    confirmPick(slots[0].id, player, player.country, player.year);
  } else {
    state.activeDraft = { player, country: player.country, year: player.year };
    $('draftInstruct').textContent = 'Tap a highlighted slot to place this player';
    document.querySelectorAll(`.slot`).forEach(n => {
      const s = slotById(n.dataset.slotId);
      if (!state.picks[s.id] && player.sp2.includes(s.label)) n.classList.add('armed');
    });
    toast('Tap a slot on the pitch to confirm');
  }
}

/* ============================================================
   RESULT SIMULATION
   7 games (3 group + R16 + QF + SF + Final) — the brand's "7-0-0".
   Anchors calibrated by Monte Carlo simulation of the actual spin+draft
   mechanic (weighted squad spin, icon offers, random eligible pick) so a
   typical/unguided draft (S≈70 median) lands at the target stage-reach
   odds: Round of 16 ~65%, Quarter-Final ~45%, Semi-Final ~35%,
   Final/Runner-up ~15-22%, Champion ~8-12%. Drafting deliberately
   (e.g. sorting by rating, taking every icon) pushes S well above this
   baseline toward the Unbeaten/Perfect tiers.
   ============================================================ */
const RECORD_ANCHORS = [
  [55.0, 0, 0],
  [62.0, 0, 1],
  [70.06, 0, 1],
  [70.66, 1, 1],  // 70.36 -> Round of 16+ ≈ 65%
  [71.79, 1, 1],
  [72.39, 2, 1],  // 72.09 -> Quarter-Finalist+ ≈ 45%
  [72.70, 2, 1],
  [73.30, 3, 1],  // 73.00 -> Semi-Finalist+ ≈ 35%
  [74.43, 3, 1],
  [75.03, 4, 1],  // 74.73 -> Runner-Up+ ≈ 15-22%
  [75.61, 4, 1],
  [76.21, 5, 1],  // 75.91 -> World Champion+ ≈ 8-12%
  [83.0, 5, 1],
  [85.0, 6, 1],   // Unbeaten floor
  [90.0, 7, 0],   // 7-0-0 — the perfect run
];
const PERFECT_S = 90.0;

function recordFromRating(S){
  if (S >= PERFECT_S) return { W: GAMES, D: 0, L: 0 };
  const Sc = clamp(S, RECORD_ANCHORS[0][0], PERFECT_S);
  let a = RECORD_ANCHORS[0], b = RECORD_ANCHORS[RECORD_ANCHORS.length-1];
  for (let i = 0; i < RECORD_ANCHORS.length - 1; i++) {
    if (Sc >= RECORD_ANCHORS[i][0] && Sc <= RECORD_ANCHORS[i+1][0]) { a = RECORD_ANCHORS[i]; b = RECORD_ANCHORS[i+1]; break; }
  }
  const t = (Sc - a[0]) / (b[0] - a[0]);
  let W = clamp(Math.round(a[1] + (b[1]-a[1]) * t), 0, GAMES);
  let D = clamp(Math.round(a[2] + (b[2]-a[2]) * t), 0, GAMES - W);
  return { W, D, L: GAMES - W - D };
}

function computeRecord(){
  const rows = SLOTS.map(slot => {
    const pick = state.picks[slot.id];
    return { slot, pick, eff: pick.player.o };
  });
  const S = rows.reduce((a, r) => a + r.eff, 0) / rows.length;
  let { W, D, L } = recordFromRating(S);
  if (S >= PERFECT_S) { W = GAMES; D = 0; L = 0; }
  else if (W === GAMES) { W = GAMES - 1; D = 1; L = 0; } // one shy of perfect stays unbeaten
  return { W, D, L, pts: W*3 + D, S: +S.toFixed(1), rows };
}

const RUN_BY_WINS = ['Group Stage Exit', 'Round of 16', 'Quarter-Finalist', 'Semi-Finalist', 'Runner-Up', 'World Champion', 'World Champion', 'World Champion'];
function tierFor(r){
  if (r.W === GAMES) return { name: '7-0-0', sub: 'The perfect World Cup' };
  if (r.L === 0) return { name: 'Unbeaten Champion', sub: `${r.W}-${r.D}-${r.L}, never lost` };
  if (r.W >= 5) return { name: 'World Champion', sub: 'Lifted the trophy' };
  return { name: RUN_BY_WINS[r.W], sub: `${r.W}-${r.D}-${r.L} record` };
}

function groupStageLine(r){
  // First 3 games are framed as the group stage; deterministic-but-flavorful split of W/D/L across the 7.
  const g = { W:0, D:0, L:0 };
  let w = r.W, d = r.D, l = r.L;
  for (let i = 0; i < 3; i++) {
    if (w > 0) { g.W++; w--; } else if (d > 0) { g.D++; d--; } else { g.L++; l--; }
  }
  return g;
}

function topPlayer(rows){ return rows.reduce((best, r) => (!best || r.eff > best.eff) ? r : best, null); }
function topScorer(rows){
  const fws = rows.filter(r => r.pick.player.p[0] === 'FW');
  const pool = fws.length ? fws : rows;
  return pool.reduce((best, r) => (!best || r.pick.player.sho > best.pick.player.sho) ? r : best, null);
}

/* ---------------- results screen ---------------- */
function wireResultsScreen(){
  $('shareBtn').addEventListener('click', shareResult);
  $('againBtn').addEventListener('click', showSetup);
  $('showMoreBtn').addEventListener('click', () => {
    const bd = $('breakdown');
    bd.classList.toggle('hidden');
    $('showMoreBtn').textContent = bd.classList.contains('hidden') ? 'Show full tournament breakdown ▾' : 'Hide breakdown ▴';
  });
}

let lastRecord = null;
function showResults(){
  const r = computeRecord();
  lastRecord = r;
  const tier = tierFor(r);

  $('gameScreen').classList.add('hidden');
  $('resultsScreen').classList.remove('hidden');

  $('recW').textContent = r.W;
  $('recD').textContent = r.D;
  $('recL').textContent = r.L;
  $('recordKey').textContent = `W · D · L over ${GAMES} games · ${r.pts} pts · squad avg ${r.S}`;
  $('tierBadge').textContent = tier.name;
  $('tierSub').textContent = tier.sub;
  $('resultsQ').textContent = r.W === GAMES ? 'You went 7-0-0.' : `You finished ${tier.name}.`;

  const g = groupStageLine(r);
  $('bdGroup').textContent = `${g.W}-${g.D}-${g.L}`;
  $('bdRun').textContent = RUN_BY_WINS[r.W];

  const top = topPlayer(r.rows);
  $('bdTopPlayer').textContent = top.pick.player.n;
  $('bdTopPlayerSub').textContent = `${top.pick.player.o} OVR · ${top.pick.country}`;

  const scorer = topScorer(r.rows);
  $('bdTopScorer').textContent = scorer.pick.player.n;
  $('bdTopScorerSub').textContent = `${scorer.pick.player.sho} SHO · ${scorer.pick.country}`;

  $('xiList').innerHTML = r.rows.map(row => {
    const [shirt] = colorFor(row.pick.country);
    return `<div class="xi-row">
      <div class="p-jersey" style="background:${shirt}">${initials(row.pick.player.n)}</div>
      <div class="p-info"><div class="p-name">${row.pick.player.n}</div><div class="p-meta">${row.slot.label} · ${row.pick.country} ${row.pick.year}</div></div>
      <span class="p-ovr-badge ${ovrTier(row.pick.player.o)}">${row.pick.player.o}</span>
    </div>`;
  }).join('');

  $('breakdown').classList.add('hidden');
  $('showMoreBtn').textContent = 'Show full tournament breakdown ▾';

  track('squad_completed', { W: r.W, D: r.D, L: r.L, S: r.S, formation: state.formation, mode: state.mode });
  if (r.W === GAMES) track('seven_oh_oh', { S: r.S });
}

function shareText(){
  const r = lastRecord;
  return `I went ${r.W}-${r.D}-${r.L} in 7-0-0, the World Cup squad builder. Build yours at 7-0-0.com #7oh0`;
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function buildShareCanvas(){
  const r = lastRecord;
  const tier = tierFor(r);
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a1f14'); bg.addColorStop(1, '#0f2b1c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#e3b23c';
  ctx.font = '800 70px -apple-system, sans-serif';
  ctx.fillText('7-0-0', W/2, 120);
  ctx.fillStyle = '#a9c4b3';
  ctx.font = '600 24px -apple-system, sans-serif';
  ctx.fillText('WORLD CUP SQUAD BUILDER', W/2, 160);

  ctx.fillStyle = '#f0d28a';
  ctx.font = '800 170px -apple-system, sans-serif';
  ctx.fillText(`${r.W}-${r.D}-${r.L}`, W/2, 340);

  ctx.fillStyle = '#a9c4b3';
  ctx.font = '500 28px -apple-system, sans-serif';
  ctx.fillText(`${GAMES} GAMES · ${r.pts} PTS · SQUAD AVG ${r.S}`, W/2, 390);

  ctx.font = '800 34px -apple-system, sans-serif';
  const tierText = tier.name.toUpperCase();
  const tw = ctx.measureText(tierText).width + 70;
  roundRect(ctx, W/2 - tw/2, 425, tw, 68, 34);
  ctx.fillStyle = '#e3b23c'; ctx.fill();
  ctx.fillStyle = '#1a1206';
  ctx.fillText(tierText, W/2, 470);

  const pitchX = 110, pitchY = 560, pitchW = W - 220, pitchH = 640;
  const pg = ctx.createLinearGradient(0, pitchY, 0, pitchY + pitchH);
  pg.addColorStop(0, '#1d6b3e'); pg.addColorStop(1, '#19602f');
  roundRect(ctx, pitchX, pitchY, pitchW, pitchH, 18);
  ctx.fillStyle = pg; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3;
  ctx.strokeRect(pitchX + 10, pitchY + 10, pitchW - 20, pitchH - 20);

  r.rows.forEach(row => {
    const slot = row.slot;
    const cx = pitchX + (slot.x / 100) * pitchW;
    const cy = pitchY + (slot.y / 100) * pitchH;
    const [shirt] = colorFor(row.pick.country);
    roundRect(ctx, cx - 28, cy - 28, 56, 56, 12);
    ctx.fillStyle = shirt; ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 22px -apple-system, sans-serif';
    ctx.fillText(initials(row.pick.player.n), cx, cy + 8);
    ctx.font = '600 17px -apple-system, sans-serif';
    ctx.fillText(row.pick.player.n.split(' ').pop(), cx, cy + 48);
  });

  ctx.fillStyle = '#a9c4b3';
  ctx.font = '500 24px -apple-system, sans-serif';
  ctx.fillText('build your own at 7-0-0.com', W/2, H - 50);

  return canvas;
}

async function shareResult(){
  const text = shareText();
  try {
    const canvas = buildShareCanvas();
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('canvas toBlob failed');
    const file = new File([blob], '7-0-0-result.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ text, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '7-0-0-result.png';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    try { await navigator.clipboard.writeText(text); toast('Image downloaded + result copied'); }
    catch(e){ toast('Image downloaded'); }
  } catch(e){
    try { await navigator.clipboard.writeText(text); toast('Result copied to clipboard'); }
    catch(e2){ toast(text); }
  }
}

boot();
