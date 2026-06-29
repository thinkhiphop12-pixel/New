/* Bracket — World Cup 2026 simulator
   Ported from a Dixon-Coles match-engine simulator (Python/Streamlit) the
   user designed, into a static client-side game for Ball Knowledge. */

const DC_RHO = -0.10;
const DC_MAX_GOALS = 10;
const AVG_GOALS_PER_TEAM = 1.35;

let DATA = null;
let lastMonteCarlo = null;

// ---------------------------------------------------------------------------
// Dixon-Coles match engine
// ---------------------------------------------------------------------------

function poissonPmf(k, lam) {
  return Math.pow(lam, k) * Math.exp(-lam) / factorial(k);
}
const FACT_CACHE = [1];
function factorial(n) {
  for (let i = FACT_CACHE.length; i <= n; i++) FACT_CACHE[i] = FACT_CACHE[i - 1] * i;
  return FACT_CACHE[n];
}

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

  const cells = [];
  let total = 0;
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
  for (const [i, j, p] of cells) {
    acc += p;
    if (r <= acc) return [i, j];
  }
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
    scoreA: goalsA, scoreB: goalsB,
    xgA: +lamA.toFixed(2), xgB: +lamB.toFixed(2),
    extraTime: false, etScoreA: 0, etScoreB: 0,
    penalties: false, penaltyScoreA: 0, penaltyScoreB: 0,
    winner: null,
    finalGoals: { a: [], b: [] },
  };

  for (let i = 0; i < goalsA; i++) result.finalGoals.a.push(pickScorer(teamA));
  for (let i = 0; i < goalsB; i++) result.finalGoals.b.push(pickScorer(teamB));

  if (!allowDraw && goalsA === goalsB) {
    const [etA, etB] = sampleDixonColes(lamA * 0.33, lamB * 0.33);
    result.extraTime = true;
    result.etScoreA = etA; result.etScoreB = etB;
    const totalA = goalsA + etA, totalB = goalsB + etB;
    if (totalA === totalB) {
      result.penalties = true;
      const [pa, pb] = simulatePenalties(teamA, teamB);
      result.penaltyScoreA = pa; result.penaltyScoreB = pb;
      result.winner = pa > pb ? teamA.code : teamB.code;
    } else {
      result.winner = totalA > totalB ? teamA.code : teamB.code;
    }
  } else if (goalsA > goalsB) {
    result.winner = teamA.code;
  } else if (goalsB > goalsA) {
    result.winner = teamB.code;
  } else {
    result.winner = null; // draw
  }
  return result;
}

// ---------------------------------------------------------------------------
// Group stage
// ---------------------------------------------------------------------------

function freshStanding(code) {
  return { team: code, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };
}

function simulateGroupStage(teams, groups) {
  const allTables = {}, allMatches = {};
  for (const [letter, codes] of Object.entries(groups)) {
    const standings = {};
    codes.forEach(c => standings[c] = freshStanding(c));
    const matches = [];

    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        const codeA = codes[i], codeB = codes[j];
        const result = simulateMatch(teams[codeA], teams[codeB], true);
        matches.push(result);

        const sa = standings[codeA], sb = standings[codeB];
        sa.played++; sb.played++;
        sa.gf += result.scoreA; sa.ga += result.scoreB;
        sb.gf += result.scoreB; sb.ga += result.scoreA;
        if (result.scoreA > result.scoreB) { sa.wins++; sa.points += 3; sb.losses++; }
        else if (result.scoreB > result.scoreA) { sb.wins++; sb.points += 3; sa.losses++; }
        else { sa.draws++; sb.draws++; sa.points++; sb.points++; }
      }
    }

    const table = Object.values(standings).sort((x, y) => {
      const gdX = x.gf - x.ga, gdY = y.gf - y.ga;
      if (y.points !== x.points) return y.points - x.points;
      if (gdY !== gdX) return gdY - gdX;
      if (y.gf !== x.gf) return y.gf - x.gf;
      return (teams[x.team].fifa_ranking ?? 100) - (teams[y.team].fifa_ranking ?? 100);
    });

    allTables[letter] = table;
    allMatches[letter] = matches;
  }
  return [allTables, allMatches];
}

function getBestThirdPlace(tables, teams) {
  const thirdPlaced = [];
  for (const [letter, table] of Object.entries(tables)) {
    if (table.length >= 3) thirdPlaced.push([letter, table[2]]);
  }
  thirdPlaced.sort((a, b) => {
    const x = a[1], y = b[1];
    const gdX = x.gf - x.ga, gdY = y.gf - y.ga;
    if (y.points !== x.points) return y.points - x.points;
    if (gdY !== gdX) return gdY - gdX;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return (teams[x.team].fifa_ranking ?? 100) - (teams[y.team].fifa_ranking ?? 100);
  });
  return thirdPlaced.slice(0, 8).map(([, s]) => s);
}

// ---------------------------------------------------------------------------
// Knockout stage
// ---------------------------------------------------------------------------

function assignThirdPlaceTeams(qualifyingGroups, thirdPlaceSlots) {
  const slots = Object.keys(thirdPlaceSlots).map(Number).sort((a, b) => a - b);
  const assignment = {};
  const remaining = new Set(qualifyingGroups);

  function backtrack(idx) {
    if (idx === slots.length) return remaining.size === 0;
    const slot = slots[idx];
    const candidates = thirdPlaceSlots[slot].filter(g => remaining.has(g)).sort();
    for (const group of candidates) {
      assignment[slot] = group;
      remaining.delete(group);
      if (backtrack(idx + 1)) return true;
      remaining.add(group);
      delete assignment[slot];
    }
    return false;
  }

  if (backtrack(0)) return assignment;
  // Greedy fallback
  const remList = [...qualifyingGroups];
  const result = {};
  for (const slot of slots) {
    const idx = remList.findIndex(g => thirdPlaceSlots[slot].includes(g));
    if (idx !== -1) { result[slot] = remList[idx]; remList.splice(idx, 1); }
  }
  return result;
}

function resolveSlot(slot, tables, thirdPlaceAssignment, matchId) {
  if (slot.startsWith('3_')) {
    if (matchId != null && thirdPlaceAssignment[matchId]) {
      return tables[thirdPlaceAssignment[matchId]][2].team;
    }
    return 'TBD';
  }
  const position = parseInt(slot[0], 10) - 1;
  const group = slot[1];
  return tables[group][position].team;
}

function knockoutMatch(teams, codeA, codeB) {
  return simulateMatch(teams[codeA], teams[codeB], false);
}

function simulateKnockoutStage(teams, tables, thirdPlaceStandings, bracket) {
  const thirdGroups = [];
  const qualifiedThirdCodes = thirdPlaceStandings.map(s => s.team);
  for (const [letter, table] of Object.entries(tables)) {
    if (table.length >= 3 && qualifiedThirdCodes.includes(table[2].team)) thirdGroups.push(letter);
  }
  const thirdPlaceAssignment = assignThirdPlaceTeams(thirdGroups.sort(), bracket.thirdPlaceSlots);

  // Round of 32
  const r32Matches = [];
  const r32Winners = {};
  for (const match of bracket.roundOf32) {
    const codeA = resolveSlot(match.slot_a, tables, thirdPlaceAssignment, match.id);
    const codeB = resolveSlot(match.slot_b, tables, thirdPlaceAssignment, match.id);
    if (codeA === 'TBD' || codeB === 'TBD') continue;
    const result = knockoutMatch(teams, codeA, codeB);
    result.label = match.label;
    r32Matches.push(result);
    r32Winners[match.id] = result.winner;
  }

  const r32Ids = bracket.roundOf32.map(m => m.id);
  const r16Matches = []; const r16Winners = [];
  for (const [ia, ib] of bracket.roundOf16Feeds) {
    const winnerA = r32Winners[r32Ids[ia]], winnerB = r32Winners[r32Ids[ib]];
    if (!winnerA || !winnerB) continue;
    const result = knockoutMatch(teams, winnerA, winnerB);
    r16Matches.push(result); r16Winners.push(result.winner);
  }

  const qfMatches = []; const qfWinners = [];
  for (const [ia, ib] of bracket.qfFeeds) {
    if (ia < r16Winners.length && ib < r16Winners.length) {
      const result = knockoutMatch(teams, r16Winners[ia], r16Winners[ib]);
      qfMatches.push(result); qfWinners.push(result.winner);
    }
  }

  const sfMatches = []; const sfWinners = []; const sfLosers = [];
  for (const [ia, ib] of bracket.sfFeeds) {
    if (ia < qfWinners.length && ib < qfWinners.length) {
      const result = knockoutMatch(teams, qfWinners[ia], qfWinners[ib]);
      sfMatches.push(result); sfWinners.push(result.winner);
      sfLosers.push(result.winner === result.teamB ? result.teamA : result.teamB);
    }
  }

  let thirdPlaceMatch = null;
  if (sfLosers.length === 2) thirdPlaceMatch = knockoutMatch(teams, sfLosers[0], sfLosers[1]);

  let finalMatch = null, champion = null, runnerUp = null;
  if (sfWinners.length === 2) {
    finalMatch = knockoutMatch(teams, sfWinners[0], sfWinners[1]);
    champion = finalMatch.winner;
    runnerUp = champion === finalMatch.teamB ? finalMatch.teamA : finalMatch.teamB;
  }

  return {
    groupTables: tables, r32Matches, r16Matches, qfMatches, sfMatches,
    thirdPlaceMatch, finalMatch, champion, runnerUp,
    thirdPlace: thirdPlaceMatch ? thirdPlaceMatch.winner : null,
  };
}

function simulateTournament(teams, groups, bracket) {
  const [tables, groupMatches] = simulateGroupStage(teams, groups);
  const thirdPlaceStandings = getBestThirdPlace(tables, teams);
  const result = simulateKnockoutStage(teams, tables, thirdPlaceStandings, bracket);
  result.groupMatches = groupMatches;
  result.thirdPlaceRanking = thirdPlaceStandings;
  return result;
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------

function runMonteCarlo(teams, groups, bracket, n) {
  const stages = ['Group Exit', 'R32', 'R16', 'QF', 'SF', 'Final', 'Winner'];
  const codes = Object.keys(teams);
  const counts = {};
  codes.forEach(c => { counts[c] = {}; stages.forEach(s => counts[c][s] = 0); });
  const winCounts = {};
  codes.forEach(c => winCounts[c] = 0);
  const finalMatchups = {};

  for (let run = 0; run < n; run++) {
    const result = simulateTournament(teams, groups, bracket);
    const r32Teams = new Set(), r16Teams = new Set(), qfTeams = new Set(), sfTeams = new Set(), finalists = new Set();
    result.r32Matches.forEach(m => { r32Teams.add(m.teamA); r32Teams.add(m.teamB); });
    result.r16Matches.forEach(m => { r16Teams.add(m.teamA); r16Teams.add(m.teamB); });
    result.qfMatches.forEach(m => { qfTeams.add(m.teamA); qfTeams.add(m.teamB); });
    result.sfMatches.forEach(m => { sfTeams.add(m.teamA); sfTeams.add(m.teamB); });
    if (result.finalMatch) {
      finalists.add(result.finalMatch.teamA); finalists.add(result.finalMatch.teamB);
      const pair = [result.finalMatch.teamA, result.finalMatch.teamB].sort().join('|');
      finalMatchups[pair] = (finalMatchups[pair] ?? 0) + 1;
    }

    for (const code of codes) {
      if (result.champion === code) counts[code]['Winner']++;
      else if (finalists.has(code)) counts[code]['Final']++;
      else if (sfTeams.has(code)) counts[code]['SF']++;
      else if (qfTeams.has(code)) counts[code]['QF']++;
      else if (r16Teams.has(code)) counts[code]['R16']++;
      else if (r32Teams.has(code)) counts[code]['R32']++;
      else counts[code]['Group Exit']++;
    }
    if (result.champion) winCounts[result.champion]++;
  }

  const probs = {};
  for (const code of codes) {
    probs[code] = {};
    for (const s of stages) probs[code][s] = +(counts[code][s] / n * 100).toFixed(1);
  }
  const winProbs = {};
  for (const code of codes) winProbs[code] = +(winCounts[code] / n * 100).toFixed(1);

  let mostLikelyFinal = null, mostLikelyPct = 0;
  let best = 0;
  for (const [pair, c] of Object.entries(finalMatchups)) {
    if (c > best) { best = c; mostLikelyFinal = pair; }
  }
  if (mostLikelyFinal) mostLikelyPct = +(best / n * 100).toFixed(1);

  return { n, stageProbs: probs, winProbs, mostLikelyFinal, mostLikelyPct };
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

const TEAM_COLORS = {
  ARG: '#75AADB', BRA: '#009B3A', FRA: '#0055A4', GER: '#000000', ESP: '#C60B1E',
  ENG: '#CF081F', NED: '#FF6600', POR: '#DA291C', URU: '#5B92E5', CRO: '#FF0000',
  BEL: '#EAB818', MEX: '#006847', COL: '#FCD116', SUI: '#FF0000', SWE: '#FECC02',
  USA: '#3C3B6E', JPN: '#BC002D', KOR: '#0047A0', MAR: '#C1272D', SEN: '#00853F',
  TUN: '#E70013', ALG: '#006233', EGY: '#CE1126', GHA: '#006B3F', NOR: '#BA0C2F',
  AUT: '#ED2939', SCO: '#005EB8', PAR: '#D52B1E', ECU: '#FFD100', AUS: '#FFCD00',
  CZE: '#D7141A', CAN: '#FF0000', QAT: '#8A1538', RSA: '#007749', TUR: '#E30A17',
  CIV: '#FF8200', NZL: '#000000', IRN: '#239F40', BIH: '#002664', HAI: '#00209F',
  IRQ: '#CE1126', JOR: '#007A3D', UZB: '#1EB53A', COD: '#007FFF', PAN: '#DA291C',
  KSA: '#006C35', CPV: '#003893', CUR: '#002B7F',
};

function contrastColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return ((r * 299 + g * 587 + b * 114) / 1000) > 150 ? '#1a1206' : '#ffffff';
}

function teamColor(code) { return TEAM_COLORS[code] || '#7c8a96'; }

function teamChip(code, opts = {}) {
  const t = DATA.teams[code];
  const color = teamColor(code);
  const ink = contrastColor(color);
  const size = opts.size || 'md';
  return `<span class="tc-chip tc-chip-${size}">
    <span class="tc-flag">${t.flag}</span>
    <span class="tc-name">${t.name}</span>
  </span>`;
}

function fmtScoreline(m) {
  let s = `${m.scoreA}-${m.scoreB}`;
  if (m.extraTime) s += ` <span class="tc-sub">(aet ${m.scoreA + m.etScoreA}-${m.scoreB + m.etScoreB})</span>`;
  if (m.penalties) s += ` <span class="tc-sub">pens ${m.penaltyScoreA}-${m.penaltyScoreB}</span>`;
  return s;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function renderSetup() {
  const root = document.getElementById('setupGroups');
  root.innerHTML = '';
  for (const [letter, codes] of Object.entries(DATA.groups)) {
    const block = document.createElement('div');
    block.className = 'group-block';
    block.innerHTML = `<div class="group-title">Group ${letter}</div>`;
    const grid = document.createElement('div');
    grid.className = 'group-team-grid';
    codes.forEach(code => {
      const t = DATA.teams[code];
      const color = teamColor(code);
      const ink = contrastColor(color);
      const card = document.createElement('div');
      card.className = 'team-mini-card';
      card.innerHTML = `
        <span class="tmc-icon" style="background:${color};color:${ink}">${t.flag}</span>
        <span class="tmc-name">${t.name}</span>
        <span class="tmc-rank">#${t.fifa_ranking}</span>
      `;
      grid.appendChild(card);
    });
    block.appendChild(grid);
    root.appendChild(block);
  }
}

function showView(name) {
  ['setupView', 'singleView', 'mcView'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== name);
  });
}

function renderSingleRun() {
  const result = simulateTournament(DATA.teams, DATA.groups, DATA.bracket);
  const root = document.getElementById('singleResult');
  root.innerHTML = '';

  // Champion banner
  const banner = document.createElement('div');
  banner.className = 'champion-banner';
  const champ = DATA.teams[result.champion];
  banner.innerHTML = `
    <div class="cb-label">CHAMPION</div>
    <div class="cb-team">${champ.flag} ${champ.name}</div>
    <div class="cb-runnerup">Runner-up: ${DATA.teams[result.runnerUp].flag} ${DATA.teams[result.runnerUp].name}</div>
  `;
  root.appendChild(banner);
  launchConfetti();

  // Group tables
  const groupsSection = document.createElement('div');
  groupsSection.className = 'result-section';
  groupsSection.innerHTML = '<h3>Group stage</h3>';
  const tableGrid = document.createElement('div');
  tableGrid.className = 'group-table-grid';
  for (const [letter, table] of Object.entries(result.groupTables)) {
    const box = document.createElement('div');
    box.className = 'group-table-box';
    let rows = table.map((s, i) => {
      const t = DATA.teams[s.team];
      const qualified = i < 2;
      return `<tr class="${qualified ? 'qualified' : ''}">
        <td>${i + 1}</td><td>${t.flag} ${t.name}</td>
        <td>${s.played}</td><td>${s.points}</td><td>${s.gf - s.ga >= 0 ? '+' : ''}${s.gf - s.ga}</td>
      </tr>`;
    }).join('');
    box.innerHTML = `
      <div class="gtb-title">Group ${letter}</div>
      <table class="gtb-table">
        <thead><tr><th></th><th>Team</th><th>P</th><th>Pts</th><th>GD</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    tableGrid.appendChild(box);
  }
  groupsSection.appendChild(tableGrid);
  root.appendChild(groupsSection);

  // Knockout rounds
  const rounds = [
    ['Round of 32', result.r32Matches],
    ['Round of 16', result.r16Matches],
    ['Quarter-finals', result.qfMatches],
    ['Semi-finals', result.sfMatches],
  ];
  rounds.forEach(([title, matches]) => {
    if (!matches.length) return;
    const sec = document.createElement('div');
    sec.className = 'result-section';
    sec.innerHTML = `<h3>${title}</h3>`;
    const list = document.createElement('div');
    list.className = 'ko-match-list';
    matches.forEach(m => list.appendChild(buildKoMatchRow(m)));
    sec.appendChild(list);
    root.appendChild(sec);
  });

  if (result.thirdPlaceMatch) {
    const sec = document.createElement('div');
    sec.className = 'result-section';
    sec.innerHTML = '<h3>Third-place match</h3>';
    const list = document.createElement('div');
    list.className = 'ko-match-list';
    list.appendChild(buildKoMatchRow(result.thirdPlaceMatch));
    sec.appendChild(list);
    root.appendChild(sec);
  }

  if (result.finalMatch) {
    const sec = document.createElement('div');
    sec.className = 'result-section';
    sec.innerHTML = '<h3>Final</h3>';
    const list = document.createElement('div');
    list.className = 'ko-match-list';
    list.appendChild(buildKoMatchRow(result.finalMatch, true));
    sec.appendChild(list);
    root.appendChild(sec);
  }

  showView('singleView');
}

function buildKoMatchRow(m, big = false) {
  const a = DATA.teams[m.teamA], b = DATA.teams[m.teamB];
  const row = document.createElement('div');
  row.className = 'ko-match-row' + (big ? ' ko-big' : '');
  const winnerA = m.winner === m.teamA;
  row.innerHTML = `
    <div class="ko-team ${winnerA ? 'ko-winner' : ''}">${a.flag} ${a.name}</div>
    <div class="ko-score">${fmtScoreline(m)}</div>
    <div class="ko-team ${!winnerA ? 'ko-winner' : ''}">${b.flag} ${b.name}</div>
  `;
  if (big && (m.finalGoals.a.length || m.finalGoals.b.length)) {
    const scorers = document.createElement('div');
    scorers.className = 'ko-scorers';
    const partsA = m.finalGoals.a.length ? `${a.flag} ${m.finalGoals.a.join(', ')}` : '';
    const partsB = m.finalGoals.b.length ? `${b.flag} ${m.finalGoals.b.join(', ')}` : '';
    scorers.textContent = [partsA, partsB].filter(Boolean).join('   ·   ');
    row.appendChild(scorers);
  }
  return row;
}

function launchConfetti() {
  const container = document.getElementById('confetti');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#e3b23c', '#2ed573', '#1e90ff', '#ff6b81', '#f0d28a'];
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

function renderMonteCarlo(n) {
  const mc = runMonteCarlo(DATA.teams, DATA.groups, DATA.bracket, n);
  lastMonteCarlo = mc;
  const root = document.getElementById('mcResult');
  root.innerHTML = '';

  if (mc.mostLikelyFinal) {
    const [ca, cb] = mc.mostLikelyFinal.split('|');
    const note = document.createElement('div');
    note.className = 'mc-note';
    note.innerHTML = `Most common final across ${mc.n.toLocaleString()} runs: <strong>${DATA.teams[ca].flag} ${DATA.teams[ca].name} vs ${DATA.teams[cb].flag} ${DATA.teams[cb].name}</strong> (${mc.mostLikelyPct}% of runs)`;
    root.appendChild(note);
  }

  const codes = Object.keys(DATA.teams).sort((a, b) => mc.winProbs[b] - mc.winProbs[a]);
  const table = document.createElement('table');
  table.className = 'mc-table';
  table.innerHTML = `
    <thead><tr>
      <th>#</th><th>Team</th><th>R32</th><th>R16</th><th>QF</th><th>SF</th><th>Final</th><th>Win %</th>
    </tr></thead>
    <tbody></tbody>`;
  const tbody = table.querySelector('tbody');
  codes.forEach((code, i) => {
    const t = DATA.teams[code];
    const sp = mc.stageProbs[code];
    const reach = (s) => +(100 - sp['Group Exit'] - (s === 'R32' ? 0 : 0)).toFixed(1);
    // cumulative reach: sum of stage and all stages after it
    const stages = ['Group Exit', 'R32', 'R16', 'QF', 'SF', 'Final', 'Winner'];
    const idx = (s) => stages.indexOf(s);
    const cumulative = (s) => +stages.slice(idx(s)).reduce((acc, st) => acc + sp[st], 0).toFixed(1);
    const tr = document.createElement('tr');
    if (i < 3) tr.classList.add('mc-top');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td class="mc-team">${t.flag} ${t.name}</td>
      <td>${cumulative('R32')}%</td>
      <td>${cumulative('R16')}%</td>
      <td>${cumulative('QF')}%</td>
      <td>${cumulative('SF')}%</td>
      <td>${cumulative('Final')}%</td>
      <td class="mc-win">${mc.winProbs[code]}%</td>
    `;
    tbody.appendChild(tr);
  });
  root.appendChild(table);
  showView('mcView');
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  const res = await fetch('data.json');
  const raw = await res.json();
  DATA = {
    teams: raw.teams,
    groups: raw.groups,
    bracket: {
      roundOf32: raw.roundOf32,
      roundOf16Feeds: raw.roundOf16Feeds,
      qfFeeds: raw.qfFeeds,
      sfFeeds: raw.sfFeeds,
      thirdPlaceSlots: raw.thirdPlaceSlots,
    },
  };
  renderSetup();
  showView('setupView');

  document.getElementById('btnSimulateOnce').addEventListener('click', renderSingleRun);
  document.getElementById('btnRunMc').addEventListener('click', () => {
    const n = parseInt(document.getElementById('mcCount').value, 10);
    renderMonteCarlo(n);
  });
  document.getElementById('btnBackFromSingle').addEventListener('click', () => showView('setupView'));
  document.getElementById('btnBackFromMc').addEventListener('click', () => showView('setupView'));
  document.getElementById('btnSimulateAgain').addEventListener('click', renderSingleRun);
}

boot();
