'use strict';

/* ============================================================
   Dynasty — World Cup Manager Mode
   Draft a real 2026 World Cup nation's actual squad, then manage them
   through the genuine 48-team bracket (real groups, real knockout feeds)
   using the same Dixon-Coles match engine as Bracket. Unlike a plain
   "draft and simulate" game, every one of YOUR matches stops for a real
   decision: team news (inevitably some fatigue/an injury to manage, bench
   subs) and tactics (Attacking/Balanced/Defensive), which actually change
   the match engine's inputs for that game.
   ============================================================ */

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let DATA = null;   // dynasty/data.json — player pool
let WC = null;     // ../worldcup/data.json — real teams/groups/bracket
let GAME = null;   // persistent player-controlled state (formation, xi, bench, fatigue...)
let T = null;      // tournament-run state (tables, stage, results)

/* ---------------- Formations (slot labels = specific positions) ---------------- */
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
const BENCH_CAP = 5;

// Wide/wing-back positions are interchangeable with the touchline mid/winger slot.
// CBs can also deputize at full-back — without this, a handful of real squads that
// only list out-and-out fullbacks on one flank (e.g. France has no listed LB, Portugal
// no listed RB) would have no way to ever fill that slot and could get soft-locked
// mid-draft on formations needing both a RB and a LB.
const POS_EQUIV = {
  RM: ['RW'], RW: ['RM'],
  LM: ['LW'], LW: ['LM'],
  LB: ['LWB'], LWB: ['LB'],
  RB: ['RWB'], RWB: ['RB'],
  CB: ['RB', 'LB'],
};
function expandPositions(sp2){
  const set = new Set(sp2);
  for (const label of sp2) (POS_EQUIV[label] || []).forEach(l => set.add(l));
  return [...set];
}
function openSlotsForPlayer(player){
  const form = FORMATIONS[GAME.formation];
  const positions = expandPositions(player.sp2 || [player.sp]);
  return form.slots.filter(s => !GAME.xi[s.id] && positions.includes(s.label));
}

const SPECIFIC_TO_FAMILY = { GK:'GK', LB:'DF', RB:'DF', CB:'DF', LM:'MF', RM:'MF', CM:'MF', LW:'FW', RW:'FW', ST:'FW' };

// worldcup/data.json team names that don't exactly match dynasty/data.json's country strings.
const WC_NAME_FIX = {
  'United States': 'USA',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Curaçao': 'Curacao',
  'Ivory Coast': "Côte d'Ivoire",
  'Türkiye': 'Turkey',
};
function dynastyCountryName(wcTeamName){ return WC_NAME_FIX[wcTeamName] || wcTeamName; }

const TACTICS = {
  attacking:  { label: 'Attacking',  atk: 1.12, def: 0.90, desc: 'More goals both ways — push for the win.' },
  balanced:   { label: 'Balanced',   atk: 1.00, def: 1.00, desc: 'Stick with your real strength.' },
  defensive:  { label: 'Defensive',  atk: 0.90, def: 1.12, desc: 'Shut up shop — protect a result.' },
};

const STAGE_LABELS = {
  group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-Final', sf: 'Semi-Final', third: 'Third-Place Match', final: 'Final',
};
const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'final'];

/* ============================================================
   Dixon-Coles match engine (ported from Bracket)
   ============================================================ */
const DC_RHO = -0.10;
const DC_MAX_GOALS = 10;
const AVG_GOALS_PER_TEAM = 1.35;

function poissonPmf(k, lam) { return Math.pow(lam, k) * Math.exp(-lam) / factorial(k); }
const FACT_CACHE = [1];
function factorial(n) { for (let i = FACT_CACHE.length; i <= n; i++) FACT_CACHE[i] = FACT_CACHE[i - 1] * i; return FACT_CACHE[n]; }

function dcTau(x, y, lamX, lamY, rho) {
  if (x === 0 && y === 0) return 1.0 - lamX * lamY * rho;
  if (x === 0 && y === 1) return 1.0 + lamX * rho;
  if (x === 1 && y === 0) return 1.0 + lamY * rho;
  if (x === 1 && y === 1) return 1.0 - rho;
  return 1.0;
}

function sampleDixonColes(lamX, lamY, rho = DC_RHO, maxGoals = DC_MAX_GOALS) {
  const pmfX = []; const pmfY = [];
  for (let i = 0; i <= maxGoals; i++) { pmfX[i] = poissonPmf(i, lamX); pmfY[i] = poissonPmf(i, lamY); }
  const cells = []; let total = 0;
  for (let i = 0; i <= maxGoals; i++) {
    const px = pmfX[i];
    if (px === 0) continue;
    for (let j = 0; j <= maxGoals; j++) {
      const p = dcTau(i, j, lamX, lamY, rho) * px * pmfY[j];
      if (p > 0) { cells.push([i, j, p]); total += p; }
    }
  }
  if (total <= 0) return [Math.round(lamX), Math.round(lamY)];
  const r = Math.random() * total;
  let acc = 0;
  for (const [i, j, p] of cells) { acc += p; if (r <= acc) return [i, j]; }
  const last = cells[cells.length - 1];
  return [last[0], last[1]];
}

function calculateExpectedGoals(teamA, teamB) {
  const formA = teamA.form ?? 0.5, formB = teamB.form ?? 0.5;
  const ffA = 0.85 + 0.30 * formA;
  const ffB = 0.85 + 0.30 * formB;
  let lamA = AVG_GOALS_PER_TEAM * (teamA.attack / 1.40) * (1.40 / teamB.defense) * ffA;
  let lamB = AVG_GOALS_PER_TEAM * (teamB.attack / 1.40) * (1.40 / teamA.defense) * ffB;
  lamA = Math.max(0.3, Math.min(4.0, lamA));
  lamB = Math.max(0.3, Math.min(4.0, lamB));
  return [lamA, lamB];
}

function pickScorer(team, exclude = []) {
  const players = team.key_players || {};
  const weightsMap = { FW: 3.0, MF: 1.5, DF: 0.4, GK: 0.05 };
  const weighted = [];
  for (const [pos, names] of Object.entries(players)) {
    const w = weightsMap[pos] ?? 1.0;
    for (const name of names) if (!exclude.includes(name)) weighted.push([name, w]);
  }
  if (!weighted.length) return 'Unknown';
  const totalW = weighted.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * totalW;
  for (const [name, w] of weighted) { r -= w; if (r <= 0) return name; }
  return weighted[weighted.length - 1][0];
}

function simulatePenalties(teamA, teamB) {
  const rateA = 0.70 + 0.05 * Math.min(teamA.attack ?? 1.0, 2.0);
  const rateB = 0.70 + 0.05 * Math.min(teamB.attack ?? 1.0, 2.0);
  let scoreA = 0, scoreB = 0;
  for (let i = 0; i < 5; i++) {
    if (Math.random() < rateA) scoreA++;
    if (Math.random() < rateB) scoreB++;
    const remaining = 4 - i;
    if (scoreA > scoreB + remaining || scoreB > scoreA + remaining) break;
  }
  while (scoreA === scoreB) {
    if (Math.random() < rateA) scoreA++;
    if (Math.random() < rateB) scoreB++;
    if (scoreA !== scoreB) break;
  }
  return [scoreA, scoreB];
}

function simulateMatch(teamA, teamB, allowDraw = true) {
  const [lamA, lamB] = calculateExpectedGoals(teamA, teamB);
  const [goalsA, goalsB] = sampleDixonColes(lamA, lamB);
  const result = {
    teamA: teamA.code, teamB: teamB.code,
    nameA: teamA.name, nameB: teamB.name, flagA: teamA.flag, flagB: teamB.flag,
    scoreA: goalsA, scoreB: goalsB,
    extraTime: false, etScoreA: 0, etScoreB: 0,
    penalties: false, penaltyScoreA: 0, penaltyScoreB: 0,
    winner: null, finalGoals: { a: [], b: [] },
  };
  for (let i = 0; i < goalsA; i++) result.finalGoals.a.push(pickScorer(teamA));
  for (let i = 0; i < goalsB; i++) result.finalGoals.b.push(pickScorer(teamB));

  if (!allowDraw && goalsA === goalsB) {
    const [etA, etB] = sampleDixonColes(lamA * 0.33, lamB * 0.33);
    result.extraTime = true; result.etScoreA = etA; result.etScoreB = etB;
    const totalA = goalsA + etA, totalB = goalsB + etB;
    if (totalA === totalB) {
      result.penalties = true;
      const [pa, pb] = simulatePenalties(teamA, teamB);
      result.penaltyScoreA = pa; result.penaltyScoreB = pb;
      result.winner = pa > pb ? teamA.code : teamB.code;
    } else {
      result.winner = totalA > totalB ? teamA.code : teamB.code;
    }
  } else if (goalsA > goalsB) result.winner = teamA.code;
  else if (goalsB > goalsA) result.winner = teamB.code;
  else result.winner = null;
  return result;
}

/* ============================================================
   Group-stage / knockout bracket helpers (ported from Bracket)
   ============================================================ */
function freshStanding(code) { return { team: code, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 }; }

function applyResultToStandings(standings, codeA, codeB, result) {
  const sa = standings[codeA], sb = standings[codeB];
  sa.played++; sb.played++;
  sa.gf += result.scoreA; sa.ga += result.scoreB;
  sb.gf += result.scoreB; sb.ga += result.scoreA;
  if (result.scoreA > result.scoreB) { sa.wins++; sa.points += 3; sb.losses++; }
  else if (result.scoreB > result.scoreA) { sb.wins++; sb.points += 3; sa.losses++; }
  else { sa.draws++; sb.draws++; sa.points++; sb.points++; }
}

function sortTable(standings, codes) {
  return codes.map(c => standings[c]).sort((x, y) => {
    const gdX = x.gf - x.ga, gdY = y.gf - y.ga;
    if (y.points !== x.points) return y.points - x.points;
    if (gdY !== gdX) return gdY - gdX;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return (T.teams[x.team].fifa_ranking ?? 100) - (T.teams[y.team].fifa_ranking ?? 100);
  });
}

function simulateFullGroup(codes) {
  const standings = {}; codes.forEach(c => standings[c] = freshStanding(c));
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const result = simulateMatch(T.teams[codes[i]], T.teams[codes[j]], true);
      applyResultToStandings(standings, codes[i], codes[j], result);
    }
  }
  return sortTable(standings, codes);
}

// Round-robin pairing (circle method) for a 4-team group, by index within the group's codes array.
const ROUND_PAIRS = [[[0, 1], [2, 3]], [[0, 2], [3, 1]], [[0, 3], [1, 2]]];

function getBestThirdPlace(tables) {
  const thirdPlaced = Object.entries(tables).map(([letter, table]) => [letter, table[2]]);
  thirdPlaced.sort((a, b) => {
    const x = a[1], y = b[1];
    const gdX = x.gf - x.ga, gdY = y.gf - y.ga;
    if (y.points !== x.points) return y.points - x.points;
    if (gdY !== gdX) return gdY - gdX;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return (T.teams[x.team].fifa_ranking ?? 100) - (T.teams[y.team].fifa_ranking ?? 100);
  });
  return thirdPlaced.slice(0, 8).map(([, s]) => s);
}

function assignThirdPlaceTeams(qualifyingGroups, thirdPlaceSlots) {
  const slots = Object.keys(thirdPlaceSlots).map(Number).sort((a, b) => a - b);
  const assignment = {}; const remaining = new Set(qualifyingGroups);
  function backtrack(idx) {
    if (idx === slots.length) return remaining.size === 0;
    const slot = slots[idx];
    const candidates = thirdPlaceSlots[slot].filter(g => remaining.has(g)).sort();
    for (const group of candidates) {
      assignment[slot] = group; remaining.delete(group);
      if (backtrack(idx + 1)) return true;
      remaining.add(group); delete assignment[slot];
    }
    return false;
  }
  if (backtrack(0)) return assignment;
  const remList = [...qualifyingGroups]; const result = {};
  for (const slot of slots) {
    const idx = remList.findIndex(g => thirdPlaceSlots[slot].includes(g));
    if (idx !== -1) { result[slot] = remList[idx]; remList.splice(idx, 1); }
  }
  return result;
}

function resolveSlot(slot, tables, thirdPlaceAssignment, matchId) {
  if (slot.startsWith('3_')) {
    if (matchId != null && thirdPlaceAssignment[matchId]) return tables[thirdPlaceAssignment[matchId]][2].team;
    return 'TBD';
  }
  const position = parseInt(slot[0], 10) - 1;
  const group = slot[1];
  return tables[group][position].team;
}

/* ============================================================
   Player pool / squad-quality rating
   ============================================================ */
function nationPlayerPool(countryName) {
  return DATA.players.filter(p => p.country === countryName && p.year === 2026);
}

function buildKeyPlayers(playersMap) {
  const groups = { FW: [], MF: [], DF: [], GK: [] };
  for (const p of Object.values(playersMap)) {
    const fam = SPECIFIC_TO_FAMILY[p.sp] || (p.p && p.p[0]) || 'MF';
    (groups[fam] || groups.MF).push(p.n);
  }
  return groups;
}

// Cache of each managed nation's best-possible-XI average overall, used as the
// "this is what the real rating already assumes" benchmark for squad quality.
let POOL_TOP11_AVG = {};
function top11Avg(countryName) {
  if (POOL_TOP11_AVG[countryName] != null) return POOL_TOP11_AVG[countryName];
  const pool = [...nationPlayerPool(countryName)].sort((a, b) => b.o - a.o).slice(0, 11);
  const avg = pool.reduce((s, p) => s + p.o, 0) / (pool.length || 1);
  POOL_TOP11_AVG[countryName] = avg;
  return avg;
}

// Builds a one-off team object (real base ratings + your current XI's quality + tactics)
// to feed straight into simulateMatch — never mutates the canonical T.teams entry.
function managedTeamForMatch(xiMap, tacticKey) {
  const base = T.teams[GAME.nationCode];
  const countryName = GAME.nationName;
  const players = Object.values(xiMap).map(p => p.o - (GAME.fatigue[p.n] >= 3 ? 3 : 0));
  const avgO = players.reduce((s, v) => s + v, 0) / (players.length || 1);
  const benchmark = top11Avg(countryName);
  const squadFactor = clamp(1 - Math.max(0, benchmark - avgO) / 60, 0.75, 1.05);
  const tac = TACTICS[tacticKey] || TACTICS.balanced;
  return {
    ...base,
    attack: clamp(base.attack * squadFactor * tac.atk, 0.5, 2.3),
    defense: clamp(base.defense * squadFactor * tac.def, 0.5, 2.3),
    midfield: base.midfield * squadFactor,
    form: clamp(base.form * (0.85 + 0.3 * squadFactor), 0.2, 0.9),
    key_players: buildKeyPlayers(xiMap),
    squadFactor,
  };
}

/* ============================================================
   Persistence
   ============================================================ */
const STATS_KEY = 'bk_dynasty_stats';
function loadStats() { try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; } catch (e) { return {}; } }
function saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }
function recordCampaign(stageReachedLabel, champion) {
  const s = loadStats();
  s.played = (s.played || 0) + 1;
  if (champion) s.titles = (s.titles || 0) + 1;
  const rank = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third-Place Match', 'Final', 'Champion'];
  const cur = champion ? 'Champion' : stageReachedLabel;
  if (!s.bestStage || rank.indexOf(cur) > rank.indexOf(s.bestStage)) s.bestStage = cur;
  saveStats(s);
  return s;
}

/* ============================================================
   Boot
   ============================================================ */
async function boot() {
  try {
    const [dynRes, wcRes] = await Promise.all([fetch('data.json'), fetch('../worldcup/data.json')]);
    DATA = await dynRes.json();
    WC = await wcRes.json();
  } catch (e) {
    console.error('Failed to load data:', e);
    $('app').innerHTML = '<div class="loadError">Could not load game data — serve this folder over HTTP (not file://) and try again.</div>';
    return;
  }
  resetGame();
  $('resetBtn').addEventListener('click', resetGame);
  $('toNationBtn').addEventListener('click', () => showScreen('nationScreen'));
  $('backToFormationBtn').addEventListener('click', () => showScreen('setupScreen'));
  $('backToNationBtn').addEventListener('click', () => { GAME.xi = {}; GAME.bench = []; showScreen('nationScreen'); });
  $('startTournamentBtn').addEventListener('click', startTournamentRun);
  $('newGameBtn').addEventListener('click', resetGame);
  renderSetup();
  renderNationScreen();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

/* ============================================================
   Setup — formation
   ============================================================ */
function renderSetup() {
  const grid = $('formationGrid');
  grid.innerHTML = '';
  for (const key of Object.keys(FORMATIONS)) {
    const card = document.createElement('button');
    card.className = 'formation-card' + (GAME.formation === key ? ' selected' : '');
    card.textContent = key;
    card.onclick = () => {
      GAME.formation = key;
      GAME.xi = {}; GAME.bench = [];
      renderSetup();
      $('toNationBtn').disabled = false;
    };
    grid.appendChild(card);
  }
  showScreen('setupScreen');
}

/* ============================================================
   Nation select
   ============================================================ */
function renderNationScreen() {
  const root = $('nationGroups');
  root.innerHTML = '';
  for (const [letter, codes] of Object.entries(WC.groups)) {
    const block = document.createElement('div');
    block.className = 'group-block';
    block.innerHTML = `<div class="group-title">Group ${letter}</div>`;
    const grid = document.createElement('div');
    grid.className = 'group-team-grid';
    codes.forEach(code => {
      const t = WC.teams[code];
      const card = document.createElement('button');
      card.className = 'team-mini-card';
      card.innerHTML = `<span class="tmc-icon">${t.flag}</span><span class="tmc-name">${t.name}</span><span class="tmc-rank">#${t.fifa_ranking}</span>`;
      card.onclick = () => selectNation(code);
      grid.appendChild(card);
    });
    block.appendChild(grid);
    root.appendChild(block);
  }
}

function selectNation(code) {
  GAME.nationCode = code;
  GAME.nationName = dynastyCountryName(WC.teams[code].name);
  GAME.xi = {}; GAME.bench = [];
  GAME.fatigue = {};
  showScreen('draftScreen');
  renderDraftScreen();
}

/* ============================================================
   Draft — single real nation's actual squad
   ============================================================ */
function renderDraftScreen() {
  const t = WC.teams[GAME.nationCode];
  $('draftNationFlag').textContent = t.flag;
  $('draftNationName').textContent = t.name;

  const form = FORMATIONS[GAME.formation];
  const squadDiv = $('squadSlots');
  squadDiv.innerHTML = '';
  form.slots.forEach(slot => {
    const s = document.createElement('div');
    const pick = GAME.xi[slot.id];
    s.className = 'squad-slot' + (pick ? ' filled' : '');
    s.textContent = pick ? pick.n.split(' ').pop() : slot.label;
    s.title = pick ? `${pick.n} (${pick.sp}, ${pick.o} OVR) — tap to undo` : `Open: ${slot.label}`;
    if (pick) s.onclick = () => { delete GAME.xi[slot.id]; renderDraftScreen(); };
    squadDiv.appendChild(s);
  });
  $('xiCount').textContent = Object.keys(GAME.xi).length;

  const benchDiv = $('benchList');
  benchDiv.innerHTML = '';
  GAME.bench.forEach((p, i) => {
    const b = document.createElement('div');
    b.className = 'bench-item filled';
    b.textContent = `${p.n.split(' ').pop()} (${p.sp})`;
    b.onclick = () => { GAME.bench.splice(i, 1); renderDraftScreen(); };
    benchDiv.appendChild(b);
  });
  $('benchCount').textContent = GAME.bench.length;

  renderPlayerPool();

  const xiFull = Object.keys(GAME.xi).length === form.slots.length;
  $('startTournamentBtn').disabled = !xiFull;
}

function isDrafted(player) {
  if (Object.values(GAME.xi).includes(player)) return true;
  return GAME.bench.includes(player);
}

function renderPlayerPool() {
  const pool = nationPlayerPool(GAME.nationName).slice().sort((a, b) => b.o - a.o);
  const listDiv = $('playerList');
  listDiv.innerHTML = '';
  pool.forEach(player => {
    const drafted = isDrafted(player);
    const row = document.createElement('div');
    row.className = 'player-row' + (drafted ? ' ineligible' : '');
    row.innerHTML = `<span class="player-name">${player.n} <span class="player-pos">${player.sp}</span></span><span class="player-rating">${player.o}</span>`;
    if (!drafted) row.onclick = () => addPlayerToDraft(player);
    listDiv.appendChild(row);
  });
}

function addPlayerToDraft(player) {
  const open = openSlotsForPlayer(player);
  if (open.length) {
    GAME.xi[open[0].id] = player;
  } else if (GAME.bench.length < BENCH_CAP) {
    GAME.bench.push(player);
  } else {
    toast('Squad full — drop a player first');
    return;
  }
  renderDraftScreen();
}

function toast(msg) {
  document.querySelectorAll('.toast').forEach(el => el.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}

/* ============================================================
   Tournament orchestration
   ============================================================ */
function startTournamentRun() {
  T = {
    teams: JSON.parse(JSON.stringify(WC.teams)),
    tables: {},          // letter -> sorted standings array
    standings: {},        // letter -> {code: standing} (live, for the managed group)
    managedGroup: Object.entries(WC.groups).find(([, codes]) => codes.includes(GAME.nationCode))[0],
    matchday: 1,
    stage: 'group',
    record: { w: 0, d: 0, l: 0, gf: 0, ga: 0 },
    log: [],
    pendingMatch: null,
    r32Winners: {}, r16Winners: [], qfWinners: [], sfWinners: [], sfLosers: [],
    eliminated: false, eliminatedStage: null, champion: false,
  };

  // Resolve all 11 other groups instantly — only the managed nation's group is played out live.
  for (const [letter, codes] of Object.entries(WC.groups)) {
    if (letter === T.managedGroup) {
      const standings = {}; codes.forEach(c => standings[c] = freshStanding(c));
      T.standings[letter] = standings;
    } else {
      T.tables[letter] = simulateFullGroup(codes);
    }
  }

  GAME.gameRecord = { wins: 0, draws: 0, losses: 0 };
  renderTournamentScreen();
}

function managedGroupCodes() { return WC.groups[T.managedGroup]; }

function renderTournamentScreen() {
  showScreen('tournamentScreen');
  $('tournamentStageTitle').textContent = STAGE_LABELS[T.stage] || 'World Cup 2026';
  $('squadStatus').textContent = `${WC.teams[GAME.nationCode].flag} ${WC.teams[GAME.nationCode].name} — Record: ${T.record.w}W ${T.record.d}D ${T.record.l}L · GF ${T.record.gf} GA ${T.record.ga}`;

  if (T.stage === 'group') renderGroupStageBody();
  else renderKnockoutBody();
}

function renderGroupStageBody() {
  const root = $('tournamentBody');
  root.innerHTML = '';

  const note = document.createElement('div');
  note.className = 'mc-note';
  note.innerHTML = `Matchday <strong>${T.matchday}</strong> of 3 — Group ${T.managedGroup}`;
  root.appendChild(note);

  if (T.log.length) {
    const sec = document.createElement('div');
    sec.className = 'result-section';
    sec.innerHTML = '<h3>Latest results</h3>';
    const list = document.createElement('div');
    list.className = 'ko-match-list';
    T.log.slice(-2).forEach(m => list.appendChild(buildMatchRow(m)));
    sec.appendChild(list);
    root.appendChild(sec);
  }

  const sec2 = document.createElement('div');
  sec2.className = 'result-section';
  sec2.innerHTML = '<h3>Group standings</h3>';
  sec2.appendChild(buildGroupTable(T.managedGroup, sortTable(T.standings[T.managedGroup], managedGroupCodes())));
  root.appendChild(sec2);

  const continueBtn = $('continueBtn');
  if (T.pendingMatch) {
    continueBtn.classList.add('hidden');
    openDecisionScreen(T.pendingMatch);
  } else {
    continueBtn.classList.remove('hidden');
    continueBtn.textContent = T.matchday < 3 ? 'Play next matchday →' : 'Finish group stage →';
    continueBtn.onclick = playGroupMatchday;
  }
}

function buildGroupTable(letter, table) {
  const box = document.createElement('div');
  box.className = 'group-table-box';
  const rows = table.map((s, i) => {
    const t = T.teams[s.team];
    const mine = s.team === GAME.nationCode;
    return `<tr class="${i < 2 ? 'qualified' : ''}${mine ? ' mine' : ''}">
      <td>${i + 1}</td><td>${t.flag} ${t.name}</td>
      <td>${s.played}</td><td>${s.points}</td><td>${s.gf - s.ga >= 0 ? '+' : ''}${s.gf - s.ga}</td>
    </tr>`;
  }).join('');
  box.innerHTML = `<div class="gtb-title">Group ${letter}</div>
    <table class="gtb-table"><thead><tr><th></th><th>Team</th><th>P</th><th>Pts</th><th>GD</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  return box;
}

function buildMatchRow(m) {
  const row = document.createElement('div');
  row.className = 'ko-match-row';
  const winnerA = m.winner === m.teamA;
  const mine = m.teamA === GAME.nationCode || m.teamB === GAME.nationCode;
  row.classList.toggle('mine-row', mine);
  row.innerHTML = `
    <div class="ko-team ${winnerA ? 'ko-winner' : ''}">${m.flagA} ${m.nameA}</div>
    <div class="ko-score">${fmtScoreline(m)}</div>
    <div class="ko-team ${!winnerA ? 'ko-winner' : ''}">${m.flagB} ${m.nameB}</div>`;
  return row;
}
function fmtScoreline(m) {
  let s = `${m.scoreA}-${m.scoreB}`;
  if (m.extraTime) s += ` <span class="tc-sub">(aet ${m.scoreA + m.etScoreA}-${m.scoreB + m.etScoreB})</span>`;
  if (m.penalties) s += ` <span class="tc-sub">pens ${m.penaltyScoreA}-${m.penaltyScoreB}</span>`;
  return s;
}

// Plays the "other" fixture for this matchday immediately, then opens the decision
// screen for the managed nation's own fixture (which always plays every matchday,
// since each of the 4 teams in a group plays exactly one match per matchday).
function playGroupMatchday() {
  const codes = managedGroupCodes();
  const pairs = ROUND_PAIRS[T.matchday - 1];
  const standings = T.standings[T.managedGroup];

  pairs.forEach(([i, j]) => {
    const codeA = codes[i], codeB = codes[j];
    const involvesUser = codeA === GAME.nationCode || codeB === GAME.nationCode;
    if (involvesUser) {
      T.pendingMatch = {
        kind: 'group', codeA, codeB, allowDraw: true,
        mine: codeA === GAME.nationCode ? 'A' : 'B',
        onResolve: (result) => {
          applyResultToStandings(standings, codeA, codeB, result);
          T.log.push(result);
          T.pendingMatch = null;
          finishManagedMatch(result, codeA === GAME.nationCode ? 'A' : 'B', () => {
            if (T.matchday < 3) { T.matchday++; renderTournamentScreen(); }
            else finishGroupStage();
          });
        },
      };
    } else {
      const result = simulateMatch(T.teams[codeA], T.teams[codeB], true);
      applyResultToStandings(standings, codeA, codeB, result);
      T.log.push(result);
    }
  });

  renderTournamentScreen();
}

function finishGroupStage() {
  T.tables[T.managedGroup] = sortTable(T.standings[T.managedGroup], managedGroupCodes());
  const myTable = T.tables[T.managedGroup];
  const myPos = myTable.findIndex(s => s.team === GAME.nationCode);

  const thirdPlaceStandings = getBestThirdPlace(T.tables);
  const qualifiedThirdCodes = thirdPlaceStandings.map(s => s.team);
  const qualified = myPos < 2 || qualifiedThirdCodes.includes(GAME.nationCode);

  if (!qualified) {
    endCampaign('Group Stage', false);
    return;
  }

  T.thirdPlaceStandings = thirdPlaceStandings;
  T.stage = 'r32';
  runKnockoutRound('r32');
}

/* ---------------- Knockout rounds ---------------- */
function runKnockoutRound(stage) {
  T.stage = stage;
  T.roundMatches = []; // {id, codeA, codeB} pairs for this round
  T.roundResults = {}; // id -> result
  T.roundManagedMatchId = null;

  if (stage === 'r32') {
    const thirdGroups = [];
    const qualifiedThirdCodes = T.thirdPlaceStandings.map(s => s.team);
    for (const [letter, table] of Object.entries(T.tables)) {
      if (qualifiedThirdCodes.includes(table[2].team)) thirdGroups.push(letter);
    }
    const thirdAssignment = assignThirdPlaceTeams(thirdGroups.sort(), WC.thirdPlaceSlots);
    T.thirdAssignment = thirdAssignment;
    T.roundMatches = WC.roundOf32.map(m => ({
      id: m.id,
      codeA: resolveSlot(m.slot_a, T.tables, thirdAssignment, m.id),
      codeB: resolveSlot(m.slot_b, T.tables, thirdAssignment, m.id),
    })).filter(m => m.codeA !== 'TBD' && m.codeB !== 'TBD');
  } else if (stage === 'r16') {
    const r32Ids = WC.roundOf32.map(m => m.id);
    T.roundMatches = WC.roundOf16Feeds.map(([ia, ib], idx) => ({
      id: 1000 + idx, codeA: T.r32Winners[r32Ids[ia]], codeB: T.r32Winners[r32Ids[ib]],
    }));
  } else if (stage === 'qf') {
    T.roundMatches = WC.qfFeeds.map(([ia, ib], idx) => ({
      id: 2000 + idx, codeA: T.r16Winners[ia], codeB: T.r16Winners[ib],
    }));
  } else if (stage === 'sf') {
    T.roundMatches = WC.sfFeeds.map(([ia, ib], idx) => ({
      id: 3000 + idx, codeA: T.qfWinners[ia], codeB: T.qfWinners[ib],
    }));
  } else if (stage === 'third') {
    T.roundMatches = [{ id: 4000, codeA: T.sfLosers[0], codeB: T.sfLosers[1] }];
  } else if (stage === 'final') {
    T.roundMatches = [{ id: 4001, codeA: T.sfWinners[0], codeB: T.sfWinners[1] }];
  }

  // Auto-resolve every fixture that doesn't involve the managed nation.
  T.roundMatches.forEach(m => {
    if (m.codeA === GAME.nationCode || m.codeB === GAME.nationCode) {
      T.roundManagedMatchId = m.id;
    } else {
      T.roundResults[m.id] = knockoutAutoMatch(m.codeA, m.codeB);
    }
  });

  if (T.roundManagedMatchId == null) {
    // Managed team isn't in this round at all — shouldn't normally happen, but
    // guard by ending the campaign at the prior stage rather than continuing blind.
    finalizeRoundAndAdvance();
    return;
  }

  const m = T.roundMatches.find(x => x.id === T.roundManagedMatchId);
  T.pendingMatch = {
    kind: stage, codeA: m.codeA, codeB: m.codeB, allowDraw: false,
    mine: m.codeA === GAME.nationCode ? 'A' : 'B',
    onResolve: (result) => {
      T.roundResults[m.id] = result;
      T.log.push(result);
      T.pendingMatch = null;
      finishManagedMatch(result, m.codeA === GAME.nationCode ? 'A' : 'B', () => {
        if (result.winner !== GAME.nationCode) {
          endCampaign(STAGE_LABELS[stage], false);
        } else {
          finalizeRoundAndAdvance();
        }
      });
    },
  };
  renderTournamentScreen();
}

function knockoutAutoMatch(codeA, codeB) {
  const result = simulateMatch(T.teams[codeA], T.teams[codeB], false);
  T.log.push(result);
  return result;
}

function finalizeRoundAndAdvance() {
  const stage = T.stage;
  const winners = T.roundMatches.map(m => T.roundResults[m.id].winner);

  if (stage === 'r32') T.r32Winners = Object.fromEntries(T.roundMatches.map(m => [m.id, T.roundResults[m.id].winner]));
  else if (stage === 'r16') T.r16Winners = winners;
  else if (stage === 'qf') T.qfWinners = winners;
  else if (stage === 'sf') {
    T.sfWinners = winners;
    T.sfLosers = T.roundMatches.map(m => {
      const r = T.roundResults[m.id];
      return r.winner === r.teamA ? r.teamB : r.teamA;
    });
  } else if (stage === 'third') {
    // Managed team already resolved (won or lost the third-place match); show results either way.
    endCampaign('Third-Place Match', false);
    return;
  } else if (stage === 'final') {
    const finalResult = T.roundResults[T.roundMatches[0].id];
    endCampaign('Final', finalResult.winner === GAME.nationCode);
    return;
  }

  const next = { r32: 'r16', r16: 'qf', qf: 'sf' }[stage];
  if (next) { runKnockoutRound(next); return; }
  if (stage === 'sf') {
    // Managed team won the semi — they're in the final; the other SF's loser/loser pair
    // plays third place automatically in the background while we go straight to the final.
    const otherLosers = T.sfLosers.filter(c => c !== GAME.nationCode);
    if (otherLosers.length === 2) knockoutAutoMatch(otherLosers[0], otherLosers[1]);
    if (T.sfWinners.includes(GAME.nationCode)) { runKnockoutRound('final'); return; }
    // Managed team lost the semi — they play in the third-place match.
    runKnockoutRound('third');
    return;
  }
  renderTournamentScreen();
}

function renderKnockoutBody() {
  const root = $('tournamentBody');
  root.innerHTML = '';

  const sec = document.createElement('div');
  sec.className = 'result-section';
  sec.innerHTML = `<h3>${STAGE_LABELS[T.stage]}</h3>`;
  const list = document.createElement('div');
  list.className = 'ko-match-list';
  T.roundMatches.forEach(m => {
    const r = T.roundResults[m.id];
    if (r) list.appendChild(buildMatchRow(r));
    else {
      const row = document.createElement('div');
      row.className = 'ko-match-row mine-row';
      row.innerHTML = `<div class="ko-team">${T.teams[m.codeA].flag} ${T.teams[m.codeA].name}</div><div class="ko-score">vs</div><div class="ko-team">${T.teams[m.codeB].flag} ${T.teams[m.codeB].name}</div>`;
      list.appendChild(row);
    }
  });
  sec.appendChild(list);
  root.appendChild(sec);

  $('continueBtn').classList.add('hidden');
  if (T.pendingMatch) openDecisionScreen(T.pendingMatch);
}

/* ============================================================
   Decision screen — team news + tactics (only for YOUR matches)
   ============================================================ */
let DECISION_STATE = null;

function openDecisionScreen(pending) {
  showScreen('decisionScreen');
  const myCode = GAME.nationCode;
  const oppCode = pending.mine === 'A' ? pending.codeB : pending.codeA;
  const opp = T.teams[oppCode];

  $('decisionStage').textContent = STAGE_LABELS[pending.kind] || pending.kind;
  $('decisionMatchup').innerHTML = `${WC.teams[myCode].flag} <strong>${WC.teams[myCode].name}</strong> vs ${opp.flag} ${opp.name} <span class="opp-rank">(FIFA #${opp.fifa_ranking})</span>`;

  // Roll injuries fresh against the player's nominal XI each time a decision opens.
  const workingXi = { ...GAME.xi };
  const injured = [];
  for (const [slotId, player] of Object.entries(workingXi)) {
    if (Math.random() < 0.06) { injured.push(player.n); delete workingXi[slotId]; }
  }
  DECISION_STATE = { workingXi, injured, subs: {}, tactic: 'balanced' };

  renderTeamNews();
  renderTactics();
  $('confirmDecisionBtn').onclick = confirmDecision;
}

function renderTeamNews() {
  const form = FORMATIONS[GAME.formation];
  $('teamNewsNote').textContent = DECISION_STATE.injured.length
    ? `${DECISION_STATE.injured.join(', ')} ${DECISION_STATE.injured.length > 1 ? 'are' : 'is'} OUT injured — sub them in below.`
    : 'Full squad available. Rotate anyone carrying fatigue if you want fresh legs.';

  const root = $('teamNewsList');
  root.innerHTML = '';
  form.slots.forEach(slot => {
    const nominal = GAME.xi[slot.id];
    const isInjured = nominal && DECISION_STATE.injured.includes(nominal.n);
    const current = DECISION_STATE.subs[slot.id] || (isInjured ? null : nominal);
    const tired = current && GAME.fatigue[current.n] >= 3;

    const row = document.createElement('div');
    row.className = 'team-news-row' + (isInjured && !DECISION_STATE.subs[slot.id] ? ' news-out' : '');

    const eligibleBench = GAME.bench.filter(b => expandPositions(b.sp2 || [b.sp]).includes(slot.label));
    const options = ['<option value="">— ' + (current ? current.n : 'No replacement (weak fallback)') + ' —</option>']
      .concat(eligibleBench.map((b, i) => `<option value="${GAME.bench.indexOf(b)}">Sub in: ${b.n} (${b.sp}, ${b.o})</option>`));

    row.innerHTML = `
      <span class="news-slot">${slot.label}</span>
      <span class="news-player">${current ? current.n + ' (' + current.o + ')' : 'OUT — needs a sub'}${isInjured ? ' <span class="news-tag news-injured">INJURED</span>' : ''}${tired ? ' <span class="news-tag news-tired">TIRED</span>' : ''}</span>
      <select class="news-select" data-slot="${slot.id}">${options.join('')}</select>
    `;
    row.querySelector('select').onchange = (e) => {
      const idx = e.target.value;
      DECISION_STATE.subs[slot.id] = idx === '' ? undefined : GAME.bench[parseInt(idx, 10)];
      if (idx === '') delete DECISION_STATE.subs[slot.id];
      renderTeamNews();
    };
    root.appendChild(row);
  });
}

function renderTactics() {
  const root = $('tacticsGrid');
  root.innerHTML = '';
  Object.entries(TACTICS).forEach(([key, tac]) => {
    const btn = document.createElement('button');
    btn.className = 'tactic-card' + (DECISION_STATE.tactic === key ? ' selected' : '');
    btn.innerHTML = `<span class="tactic-label">${tac.label}</span><span class="tactic-desc">${tac.desc}</span>`;
    btn.onclick = () => { DECISION_STATE.tactic = key; renderTactics(); };
    root.appendChild(btn);
  });
}

const FALLBACK_PLAYER = { n: 'Reserve call-up', sp: 'SUB', o: 50 };

function confirmDecision() {
  const form = FORMATIONS[GAME.formation];
  const finalXi = {};
  form.slots.forEach(slot => {
    const nominal = GAME.xi[slot.id];
    const isInjured = nominal && DECISION_STATE.injured.includes(nominal.n);
    if (DECISION_STATE.subs[slot.id]) finalXi[slot.id] = DECISION_STATE.subs[slot.id];
    else if (!isInjured) finalXi[slot.id] = nominal;
    else finalXi[slot.id] = FALLBACK_PLAYER;
  });

  const usedNames = new Set(Object.values(finalXi).map(p => p.n));
  Object.keys(GAME.fatigue).forEach(n => { if (!usedNames.has(n)) GAME.fatigue[n] = 0; });
  usedNames.forEach(n => { GAME.fatigue[n] = (GAME.fatigue[n] || 0) + 1; });

  const myTeam = managedTeamForMatch(finalXi, DECISION_STATE.tactic);
  const oppCode = T.pendingMatch.mine === 'A' ? T.pendingMatch.codeB : T.pendingMatch.codeA;
  const oppTeam = T.teams[oppCode];

  let result;
  if (T.pendingMatch.mine === 'A') result = simulateMatch(myTeam, oppTeam, T.pendingMatch.allowDraw);
  else result = simulateMatch(oppTeam, myTeam, T.pendingMatch.allowDraw);
  result.teamA = T.pendingMatch.codeA; result.teamB = T.pendingMatch.codeB;

  T.pendingMatch.onResolve(result);
}

function finishManagedMatch(result, mineSide, onContinue) {
  const myScore = mineSide === 'A' ? result.scoreA : result.scoreB;
  const oppScore = mineSide === 'A' ? result.scoreB : result.scoreA;
  T.record.gf += myScore; T.record.ga += oppScore;
  if (result.winner === GAME.nationCode) { T.record.w++; GAME.gameRecord.wins++; }
  else if (result.winner === null) { T.record.d++; GAME.gameRecord.draws++; }
  else { T.record.l++; GAME.gameRecord.losses++; }
  showMatchResult(result, mineSide, onContinue);
}

function showMatchResult(result, mineSide, onContinue) {
  const myFlag = mineSide === 'A' ? result.flagA : result.flagB;
  const myName = mineSide === 'A' ? result.nameA : result.nameB;
  const oppFlag = mineSide === 'A' ? result.flagB : result.flagA;
  const oppName = mineSide === 'A' ? result.nameB : result.nameA;
  const myScore = mineSide === 'A' ? result.scoreA : result.scoreB;
  const oppScore = mineSide === 'A' ? result.scoreB : result.scoreA;
  const myScorers = mineSide === 'A' ? result.finalGoals.a : result.finalGoals.b;
  const oppScorers = mineSide === 'A' ? result.finalGoals.b : result.finalGoals.a;
  const outcome = result.winner === GAME.nationCode ? 'WIN' : (result.winner === null ? 'DRAW' : 'LOSS');

  let subline = '';
  if (result.extraTime) {
    const myEt = myScore + (mineSide === 'A' ? result.etScoreA : result.etScoreB);
    const oppEt = oppScore + (mineSide === 'A' ? result.etScoreB : result.etScoreA);
    subline = `<p class="tc-sub">aet ${myEt}-${oppEt}</p>`;
  }
  if (result.penalties) {
    const myPens = mineSide === 'A' ? result.penaltyScoreA : result.penaltyScoreB;
    const oppPens = mineSide === 'A' ? result.penaltyScoreB : result.penaltyScoreA;
    subline += `<p class="tc-sub">pens ${myPens}-${oppPens}</p>`;
  }

  showScreen('matchResultScreen');
  $('matchResultHeader').innerHTML = `<h2 class="result-outcome result-${outcome.toLowerCase()}">${outcome}</h2><p>${myFlag} ${myName} ${myScore} - ${oppScore} ${oppName} ${oppFlag}</p>${subline}`;
  $('matchResultBody').innerHTML = `
    <div class="results-summary">
      ${myScorers.length ? `<p><strong>${myName} scorers:</strong> ${myScorers.join(', ')}</p>` : ''}
      ${oppScorers.length ? `<p><strong>${oppName} scorers:</strong> ${oppScorers.join(', ')}</p>` : ''}
    </div>`;
  $('matchContinueBtn').onclick = () => onContinue();
}

/* ============================================================
   Campaign end
   ============================================================ */
function endCampaign(stageReached, champion) {
  T.eliminated = !champion; T.eliminatedStage = stageReached; T.champion = champion;
  const stats = recordCampaign(stageReached, champion);
  showScreen('resultsScreen');

  if (champion) launchConfetti();

  const headline = champion ? `🏆 World Champions!` : `Eliminated — ${stageReached}`;
  $('resultsHeader').innerHTML = `<h2>${headline}</h2><p>${WC.teams[GAME.nationCode].flag} ${WC.teams[GAME.nationCode].name}</p>`;
  $('resultsBody').innerHTML = `
    <div class="results-summary">
      <p>Record: ${T.record.w}W ${T.record.d}D ${T.record.l}L</p>
      <p>Goals: ${T.record.gf} for, ${T.record.ga} against</p>
      <p class="step-desc">All-time best run: ${stats.bestStage || stageReached}${stats.titles ? ` · ${stats.titles} title(s) won` : ''} · ${stats.played} campaign(s) played</p>
    </div>`;
}

function launchConfetti() {
  let container = $('confetti');
  if (!container) {
    container = document.createElement('div');
    container.id = 'confetti';
    container.className = 'confetti-container';
    document.body.appendChild(container);
  }
  container.innerHTML = '';
  const colors = ['#3fa85e', '#ffd700', '#4488ff', '#ff6b81', '#f0d28a'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + '%';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    el.style.animationDelay = Math.random() * 2 + 's';
    el.style.animationDuration = (2 + Math.random() * 2) + 's';
    container.appendChild(el);
  }
  setTimeout(() => { container.innerHTML = ''; }, 5000);
}

/* ============================================================
   Reset
   ============================================================ */
function resetGame() {
  GAME = { formation: null, nationCode: null, nationName: null, xi: {}, bench: [], fatigue: {}, gameRecord: { wins: 0, draws: 0, losses: 0 } };
  T = null;
  POOL_TOP11_AVG = {};
  if (DATA && WC) { renderSetup(); renderNationScreen(); }
}

document.addEventListener('DOMContentLoaded', boot);
