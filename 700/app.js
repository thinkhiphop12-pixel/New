/* ============================================================
   7-0-0 — World Cup squad builder
   Search real World Cup players, draft an XI under a budget,
   simulate the 7 games it takes to win the tournament.
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);

let DATA = null;
let SQUADS = {};        // "Country|Year" -> [players]
let SQUAD_LIST = [];    // [{key, country, year, flag, rating, xi:[...]}]
let RANKED = [];        // all players sorted by overall desc (for default list)
const BUDGET = 850;
const XI_SIZE = 11;

/* ---------- Positions & formations ---------- */
const POS_LABEL = { GK:'GK', DF:'DEF', MF:'MID', FW:'FWD' };

// Each formation: ordered rows from defence(back) to attack(front), GK implicit.
const FORMATIONS = {
  '4-3-3':   [['DF',4],['MF',3],['FW',3]],
  '4-4-2':   [['DF',4],['MF',4],['FW',2]],
  '3-5-2':   [['DF',3],['MF',5],['FW',2]],
  '4-2-3-1': [['DF',4],['MF',2],['MF',3],['FW',1]],
  '5-3-2':   [['DF',5],['MF',3],['FW',2]],
};
let FORMATION_KEY = '4-3-3';
let SLOTS = [];         // [{id,type,x,y}]

function buildSlots(key){
  const rows = FORMATIONS[key];
  const slots = [{ id:'s0', type:'GK', x:50, y:90 }];
  const R = rows.length;
  let idx = 1;
  rows.forEach((row, ri) => {
    const [type, n] = row;
    const y = R > 1 ? 74 - ri * (56 / (R - 1)) : 50;
    for (let j = 0; j < n; j++){
      const x = n > 1 ? 14 + j * (72 / (n - 1)) : 50;
      slots.push({ id:'s'+idx, type, x, y });
      idx++;
    }
  });
  return slots;
}

/* ---------- Flags ---------- */
const ISO = {
  'Argentina':'ar','Brazil':'br','France':'fr','Germany':'de','Spain':'es','Italy':'it','England':'gb-eng',
  'Netherlands':'nl','Portugal':'pt','Belgium':'be','Uruguay':'uy','Croatia':'hr','Mexico':'mx','USA':'us',
  'United States':'us','Colombia':'co','Chile':'cl','Sweden':'se','Denmark':'dk','Switzerland':'ch','Poland':'pl',
  'Japan':'jp','South Korea':'kr','Korea Republic':'kr','Nigeria':'ng','Cameroon':'cm','Ghana':'gh','Senegal':'sn',
  'Morocco':'ma','Russia':'ru','Soviet Union':'ru','Czech Republic':'cz','Czechoslovakia':'cz','Austria':'at',
  'Hungary':'hu','Scotland':'gb-sct','Wales':'gb-wls','Ireland':'ie','Norway':'no','Greece':'gr','Turkey':'tr',
  'Serbia':'rs','YUG':'rs','Yugoslavia':'rs','Ecuador':'ec','Peru':'pe','Paraguay':'py','Costa Rica':'cr',
  'Australia':'au','Iran':'ir','Saudi Arabia':'sa','Tunisia':'tn','Algeria':'dz','Egypt':'eg','Ukraine':'ua',
  'Romania':'ro','Bulgaria':'bg','Slovakia':'sk','Slovenia':'si','Bosnia and Herzegovina':'ba','Iceland':'is',
  'Honduras':'hn','Qatar':'qa','Canada':'ca','China':'cn','New Zealand':'nz','Panama':'pa','Jamaica':'jm',
};
function flagEmoji(country){
  const code = ISO[country];
  if (!code || code.includes('-')) return '⚽';
  const cc = code.toUpperCase();
  return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

/* ---------- RNG (seedable) ---------- */
function mulberry32(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function strHash(s){ let h=2166136261; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function dailyKey(d = new Date()){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function poisson(lambda, rng){
  const L = Math.exp(-lambda); let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function toast(msg){
  const host = $('toastHost'); if (!host) return;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  host.appendChild(t); requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
}

/* ---------- State ---------- */
let state = null;       // { mode, picks:{slotId:player}, }
let setupMode = null;
let setupFormation = null;
let searchPos = 'ALL';

/* ---------- Boot ---------- */
async function boot(){
  try {
    const res = await fetch('data.json?v=2');
    DATA = await res.json();
  } catch (e){
    $('setupScreen').innerHTML = '<p>Could not load player data. Please refresh.</p>';
    return;
  }
  // Group into squads
  for (const p of DATA.players){
    const key = p.country + '|' + p.year;
    (SQUADS[key] = SQUADS[key] || []).push(p);
  }
  for (const key in SQUADS){
    const arr = SQUADS[key];
    if (arr.length < 11) continue;
    const [country, year] = key.split('|');
    const xi = arr.slice().sort((a,b) => b.o - a.o).slice(0, 11);
    const rating = Math.round(xi.reduce((s,p) => s + p.o, 0) / 11 * 10) / 10;
    SQUAD_LIST.push({ key, country, year:+year, flag:flagEmoji(country), rating, xi });
  }
  RANKED = DATA.players.slice().sort((a,b) => b.o - a.o);

  // Stat labels
  $('statPlayers').textContent = (DATA.meta.total_players || DATA.players.length).toLocaleString();
  $('statSquads').textContent = SQUAD_LIST.length;
  $('statYears').textContent = (DATA.meta.years || []).length || 15;

  buildFormationGrid();
  wireSetup();
  renderStatsStrip();
}

/* ---------- Setup ---------- */
function buildFormationGrid(){
  const grid = $('formationGrid'); grid.innerHTML = '';
  Object.keys(FORMATIONS).forEach(key => {
    const b = document.createElement('button');
    b.className = 'formation-card';
    b.innerHTML = `<span class="fc-name">${key}</span>`;
    b.addEventListener('click', () => {
      setupFormation = key;
      grid.querySelectorAll('.formation-card').forEach(c => c.classList.remove('is-on'));
      b.classList.add('is-on');
      maybeEnableStart();
    });
    grid.appendChild(b);
  });
}
function wireSetup(){
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      setupMode = card.dataset.mode;
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('is-on'));
      card.classList.add('is-on');
      maybeEnableStart();
    });
  });
  $('setupStart').addEventListener('click', () => startDraft(setupMode, setupFormation));
}
function maybeEnableStart(){ $('setupStart').disabled = !(setupMode && setupFormation); }

/* ---------- Draft ---------- */
function startDraft(mode, formationKey){
  FORMATION_KEY = formationKey;
  SLOTS = buildSlots(formationKey);
  state = { mode, picks:{}, formation:formationKey };
  $('setupScreen').classList.add('hidden');
  $('runScreen').classList.add('hidden');
  $('draftScreen').classList.remove('hidden');
  buildPitch();
  wireDraft();
  searchPos = 'ALL';
  document.querySelectorAll('.sf-btn').forEach(b => b.classList.toggle('is-on', b.dataset.pos === 'ALL'));
  $('playerSearch').value = '';
  renderResults('');
  refreshDraftBar();
  window.scrollTo(0,0);
}

let draftWired = false;
function wireDraft(){
  if (draftWired) return; draftWired = true;
  $('playerSearch').addEventListener('input', (e) => renderResults(e.target.value));
  document.querySelectorAll('.sf-btn').forEach(b => {
    b.addEventListener('click', () => {
      searchPos = b.dataset.pos;
      document.querySelectorAll('.sf-btn').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      renderResults($('playerSearch').value);
    });
  });
  $('draftReset').addEventListener('click', () => {
    state.picks = {}; refreshPitch(); refreshDraftBar(); renderResults($('playerSearch').value);
  });
  $('simBtn').addEventListener('click', simulateRun);
  $('playAgainBtn').addEventListener('click', () => {
    $('runScreen').classList.add('hidden'); $('setupScreen').classList.remove('hidden');
    setupMode = null; setupFormation = null;
    document.querySelectorAll('.mode-card,.formation-card').forEach(c => c.classList.remove('is-on'));
    $('setupStart').disabled = true; window.scrollTo(0,0);
  });
  $('shareBtn').addEventListener('click', shareResult);
}

function buildPitch(){
  const pitch = $('pitch'); pitch.innerHTML = '';
  SLOTS.forEach(slot => {
    const node = document.createElement('button');
    node.className = 'slot slot-' + slot.type;
    node.id = 'slot-' + slot.id;
    node.style.left = slot.x + '%';
    node.style.top = slot.y + '%';
    node.innerHTML = `<span class="slot-pos">${POS_LABEL[slot.type]}</span><span class="slot-name">+</span>`;
    node.addEventListener('click', () => {
      if (state.picks[slot.id]){ // remove
        delete state.picks[slot.id]; refreshPitch(); refreshDraftBar(); renderResults($('playerSearch').value);
      } else {
        $('playerSearch').focus();
        toast('Search a ' + POS_LABEL[slot.type] + ', then tap a player to add');
      }
    });
    pitch.appendChild(node);
  });
  refreshPitch();
}
function refreshPitch(){
  SLOTS.forEach(slot => {
    const node = $('slot-' + slot.id);
    const p = state.picks[slot.id];
    if (p){
      node.classList.add('filled');
      const showR = state.mode !== 'expert';
      node.innerHTML = `<span class="slot-pos">${POS_LABEL[slot.type]}</span>` +
        `<span class="slot-flag">${flagEmoji(p.country)}</span>` +
        `<span class="slot-name">${shortName(p.n)}</span>` +
        (showR ? `<span class="slot-rate">${p.o}</span>` : `<span class="slot-rate">?</span>`);
    } else {
      node.classList.remove('filled');
      node.innerHTML = `<span class="slot-pos">${POS_LABEL[slot.type]}</span><span class="slot-name">+</span>`;
    }
  });
}
function shortName(n){
  const parts = n.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}

function picksArray(){ return Object.values(state.picks); }
function spent(){ return picksArray().reduce((s,p) => s + p.o, 0); }
function pickedNames(){ return new Set(picksArray().map(p => p.n + '|' + p.country)); }

function firstOpenSlotFor(type){
  return SLOTS.find(s => s.type === type && !state.picks[s.id]);
}

function addPlayer(p){
  const slot = firstOpenSlotFor(p.p[0]);
  if (!slot){ toast('No open ' + POS_LABEL[p.p[0]] + ' slot in this formation'); return; }
  if (pickedNames().has(p.n + '|' + p.country)){ toast(p.n + ' is already in your XI'); return; }
  if (spent() + p.o > BUDGET){ toast('Over budget — free up ' + (spent() + p.o - BUDGET) + ' points'); return; }
  state.picks[slot.id] = p;
  refreshPitch(); refreshDraftBar(); renderResults($('playerSearch').value);
}

function refreshDraftBar(){
  const n = picksArray().length;
  $('budgetLeft').textContent = (BUDGET - spent());
  $('pickedCount').textContent = n + ' / ' + XI_SIZE;
  if (n > 0){
    const tr = teamRating();
    $('teamRating').textContent = state.mode === 'expert' && n < XI_SIZE ? '—' : tr.toFixed(1);
    $('chemVal').textContent = chemistryPct() + '%';
  } else {
    $('teamRating').textContent = '—'; $('chemVal').textContent = '—';
  }
  const full = n === XI_SIZE;
  $('simBtn').disabled = !full;
  $('simHint').textContent = full ? 'Your XI is ready — simulate the run.' :
    (XI_SIZE - n) + ' more to pick · ' + (BUDGET - spent()) + ' budget left';
}

/* ---------- Ratings & chemistry ---------- */
const POS_WEIGHT = { GK:1.0, DF:1.0, MF:1.05, FW:1.1 };
function teamRating(){
  const ps = picksArray(); if (!ps.length) return 0;
  let wsum = 0, w = 0;
  ps.forEach(p => { const k = POS_WEIGHT[p.p[0]] || 1; wsum += p.o * k; w += k; });
  return (wsum / w) + chemistryBonus();
}
function chemRaw(){
  const ps = picksArray(); let sum = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i+1; j < ps.length; j++){
    const a = ps[i], b = ps[j];
    if (a.country === b.country && a.year === b.year) sum += 1.2;
    else if (a.country === b.country) sum += 0.5;
    else if (a.year === b.year) sum += 0.15;
  }
  return sum;
}
function chemistryPct(){ return clamp(Math.round(chemRaw() / 40 * 100), 0, 100); }
function chemistryBonus(){ return chemistryPct() / 100 * 6; }

/* ---------- Search results ---------- */
function renderResults(q){
  q = (q || '').trim().toLowerCase();
  let pool;
  if (q){
    pool = DATA.players.filter(p => p.n.toLowerCase().includes(q));
  } else {
    pool = RANKED;
  }
  if (searchPos !== 'ALL') pool = pool.filter(p => p.p[0] === searchPos);
  pool = pool.slice().sort((a,b) => b.o - a.o).slice(0, 60);

  const meta = $('searchMeta');
  meta.textContent = q ? `${pool.length ? pool.length : 'No'} match${pool.length===1?'':'es'} for "${q}"` :
    'Top-rated players' + (searchPos !== 'ALL' ? ' · ' + POS_LABEL[searchPos] : '') + ' — type a name to search.';

  const picked = pickedNames();
  const res = $('results'); res.innerHTML = '';
  const showR = state.mode !== 'expert';
  pool.forEach(p => {
    const isPicked = picked.has(p.n + '|' + p.country);
    const canAfford = spent() + p.o <= BUDGET;
    const hasSlot = !!firstOpenSlotFor(p.p[0]);
    const row = document.createElement('button');
    row.className = 'result' + (isPicked ? ' is-picked' : '');
    if (!isPicked && (!canAfford || !hasSlot)) row.classList.add('is-blocked');
    row.innerHTML =
      `<span class="r-flag">${flagEmoji(p.country)}</span>` +
      `<span class="r-main"><span class="r-name">${p.n}</span>` +
      `<span class="r-sub">${p.country} · ${p.year} · ${p.sp || POS_LABEL[p.p[0]]}</span></span>` +
      `<span class="chip chip-pos pos-${p.p[0]}">${POS_LABEL[p.p[0]]}</span>` +
      (showR ? `<span class="r-rate">${p.o}</span>` : `<span class="r-rate">–</span>`) +
      `<span class="r-add">${isPicked ? '✓' : '+'}</span>`;
    row.addEventListener('click', () => {
      if (isPicked){ removePlayer(p); } else { addPlayer(p); }
    });
    res.appendChild(row);
  });
}
function removePlayer(p){
  for (const sid in state.picks){
    const q = state.picks[sid];
    if (q.n === p.n && q.country === p.country){ delete state.picks[sid]; break; }
  }
  refreshPitch(); refreshDraftBar(); renderResults($('playerSearch').value);
}

/* ---------- Simulation ---------- */
const ROUND_NAMES = ['Group A', 'Group B', 'Group C', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
const TARGET_RATINGS = [60, 66, 71, 75, 79, 82, 85];

function pickOpponents(rng){
  const myKeys = new Set(picksArray().map(p => p.country + '|' + p.year));
  const used = new Set();
  const opps = [];
  TARGET_RATINGS.forEach(target => {
    const cands = SQUAD_LIST
      .filter(s => !used.has(s.key) && !myKeys.has(s.key))
      .sort((a,b) => Math.abs(a.rating - target) - Math.abs(b.rating - target))
      .slice(0, 8);
    const choice = cands[Math.floor(rng() * cands.length)] || SQUAD_LIST[0];
    used.add(choice.key);
    opps.push(choice);
  });
  return opps;
}

function playMatch(myR, opp, isKnockout, rng){
  const oppR = opp.rating;
  const diff = myR - oppR;
  const lamYou = clamp(1.45 + diff * 0.07, 0.15, 5.5);
  const lamOpp = clamp(1.45 - diff * 0.07, 0.15, 5.5);
  const gYou = poisson(lamYou, rng);
  const gOpp = poisson(lamOpp, rng);
  let result, pens = null, advanced;
  if (gYou > gOpp){ result = 'W'; advanced = true; }
  else if (gYou < gOpp){ result = 'L'; advanced = false; }
  else {
    result = 'D';
    if (isKnockout){
      const pWin = clamp(0.5 + diff * 0.012, 0.2, 0.8);
      const win = rng() < pWin;
      pens = win ? 'won' : 'lost';
      advanced = win;
    } else advanced = true;
  }
  const events = buildEvents(gYou, gOpp, opp, rng);
  return { gYou, gOpp, result, pens, advanced, events };
}

function buildEvents(gYou, gOpp, opp, rng){
  const attackers = picksArray();
  const weightOf = (p) => p.p[0] === 'FW' ? 6 : p.p[0] === 'MF' ? 2.2 : p.p[0] === 'DF' ? 0.5 : 0.05;
  const totalW = attackers.reduce((s,p) => s + weightOf(p), 0);
  function scorer(){
    let r = rng() * totalW;
    for (const p of attackers){ r -= weightOf(p); if (r <= 0) return shortName(p.n); }
    return shortName(attackers[0].n);
  }
  const evs = [];
  for (let i = 0; i < gYou; i++) evs.push({ m: 1 + Math.floor(rng()*90), side:'you', who: scorer() });
  for (let i = 0; i < gOpp; i++) evs.push({ m: 1 + Math.floor(rng()*90), side:'opp', who: opp.country });
  evs.sort((a,b) => a.m - b.m);
  return evs;
}

function simulateRun(){
  const ps = picksArray();
  if (ps.length !== XI_SIZE) return;
  const seedStr = state.mode === 'daily'
    ? 'daily-' + dailyKey()
    : 'run-' + Date.now() + '-' + Math.random();
  const rng = mulberry32(strHash(seedStr));
  const myR = teamRating();
  const opps = pickOpponents(rng);

  const games = [];
  let eliminated = false, exitRound = -1;
  let W = 0, D = 0, L = 0;
  for (let i = 0; i < 7; i++){
    const isKnockout = i >= 3;
    const m = playMatch(myR, opps[i], isKnockout, rng);
    games.push({ round: ROUND_NAMES[i], opp: opps[i], ...m, knockout: isKnockout });
    if (m.result === 'W') W++; else if (m.result === 'D') D++; else L++;
    if (isKnockout && !m.advanced){ eliminated = true; exitRound = i; break; }
  }
  const championship = !eliminated; // survived all knockouts incl. final
  const result = classifyRun({ games, eliminated, exitRound, W, D, L, championship });
  recordRun(result, W, D, L);
  renderRun(result, games, W, D, L, myR);
}

function classifyRun({ eliminated, exitRound, W, D, L, championship }){
  if (championship && W === 7 && D === 0 && L === 0){
    return { tier:'perfect', title:'PERFECT 7-0-0', sub:'World Champions — seven games, seven wins, nothing dropped. Football immortality.', eyebrow:'The Perfect Cup' };
  }
  if (championship){
    return { tier:'champion', title:'WORLD CHAMPIONS', sub:`You lifted the trophy on a ${W}-${D}-${L} run — but a dropped game means it isn't a perfect 7-0-0. So close.`, eyebrow:'Champions' };
  }
  const names = ['Round of 16','Quarter-final','Semi-final','Final'];
  const r = exitRound;
  const map = {
    3: { tier:'r16', title:'ROUND OF 16 EXIT', sub:'The first knockout hurdle proved too tall. Back to the drawing board.' },
    4: { tier:'qf',  title:'QUARTER-FINAL HEARTBREAK', sub:'So close to the last four. A cruel way to go out.' },
    5: { tier:'sf',  title:'SEMI-FINAL AGONY', sub:'Within touching distance of the final, and it slipped away.' },
    6: { tier:'final', title:'RUNNERS-UP', sub:'So near the trophy. Heartbreak in the final itself.' },
  };
  const m = map[r] || map[3];
  return { ...m, eyebrow: names[r-3] + ' exit' };
}

/* ---------- Render run ---------- */
function renderRun(result, games, W, D, L, myR){
  $('draftScreen').classList.add('hidden');
  $('runScreen').classList.remove('hidden');
  $('runEyebrow').textContent = result.eyebrow;
  const title = $('runTitle'); title.textContent = result.title; title.className = 'run-title tier-' + result.tier;
  $('runSub').textContent = result.sub;
  $('runRecord').innerHTML =
    `<span class="rr-big">${W}<small>W</small> ${D}<small>D</small> ${L}<small>L</small></span>` +
    `<span class="rr-meta">Team rating ${myR.toFixed(1)} · ${FORMATION_KEY} · chemistry ${chemistryPct()}%</span>`;

  const host = $('matches'); host.innerHTML = '';
  games.forEach(g => {
    const outcome = g.result === 'W' ? 'win' : g.result === 'D' ? 'draw' : 'loss';
    const card = document.createElement('div');
    card.className = 'match card outcome-' + outcome;
    let penLine = '';
    if (g.pens) penLine = `<span class="m-pens">Penalties: ${g.pens === 'won' ? 'won' : 'lost'}</span>`;
    const evHtml = g.events.length
      ? '<ul class="m-events">' + g.events.map(e =>
          `<li class="${e.side === 'you' ? 'ev-you' : 'ev-opp'}"><span class="ev-min">${e.m}'</span> ⚽ ${e.who}</li>`).join('') + '</ul>'
      : '<p class="m-events none">No goals.</p>';
    card.innerHTML =
      `<div class="m-head"><span class="m-round">${g.round}</span>` +
        `<span class="m-badge ${outcome}">${g.result}${g.pens ? ' (pens)' : ''}</span></div>` +
      `<div class="m-score"><span class="m-team">Your XI</span>` +
        `<span class="m-nums">${g.gYou} – ${g.gOpp}</span>` +
        `<span class="m-team m-opp">${g.opp.flag} ${g.opp.country} ’${String(g.opp.year).slice(2)}</span></div>` +
      penLine + evHtml;
    host.appendChild(card);
  });
  window.scrollTo(0, 0);
}

/* ---------- Share ---------- */
function shareResult(){
  const title = $('runTitle').textContent;
  const matches = $('matches').querySelectorAll('.match');
  let grid = '';
  matches.forEach(m => {
    grid += m.classList.contains('outcome-win') ? '🟩' : m.classList.contains('outcome-draw') ? '🟨' : '🟥';
  });
  const txt = `7-0-0 ⚽ ${title}\n${grid}\nballknw.com/700`;
  if (navigator.share){ navigator.share({ text: txt }).catch(()=>{}); }
  else if (navigator.clipboard){ navigator.clipboard.writeText(txt).then(() => toast('Result copied to clipboard')); }
  else toast(txt);
}

/* ---------- Stats / streak ---------- */
const STATS_KEY = 'bk_700_stats_v2';
function loadStats(){ try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; } catch(e){ return {}; } }
function saveStats(s){ try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch(e){} }
function recordRun(result, W){
  const s = loadStats();
  s.played = (s.played || 0) + 1;
  if (result.tier === 'perfect') s.perfect = (s.perfect || 0) + 1;
  if (result.tier === 'perfect' || result.tier === 'champion') s.titles = (s.titles || 0) + 1;
  s.best = Math.max(s.best || 0, W);
  if (state.mode === 'daily'){
    const today = dailyKey();
    if (s.lastDaily !== today){
      const yest = dailyKey(new Date(Date.now() - 864e5));
      s.streak = (s.lastDaily === yest) ? (s.streak || 0) + 1 : 1;
      s.lastDaily = today;
    }
  }
  saveStats(s); renderStatsStrip();
}
function renderStatsStrip(){
  const s = loadStats();
  const strip = $('statsStrip');
  if (!s.played){ strip.classList.add('hidden'); return; }
  strip.classList.remove('hidden');
  strip.innerHTML =
    `<div class="ss"><span class="ss-n">${s.played}</span><span class="ss-l">runs</span></div>` +
    `<div class="ss"><span class="ss-n">${s.titles || 0}</span><span class="ss-l">titles</span></div>` +
    `<div class="ss"><span class="ss-n">${s.perfect || 0}</span><span class="ss-l">perfect</span></div>` +
    `<div class="ss"><span class="ss-n">${s.streak || 0}</span><span class="ss-l">day streak</span></div>`;
}

document.addEventListener('DOMContentLoaded', boot);
