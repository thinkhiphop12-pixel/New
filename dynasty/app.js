'use strict';

const $ = (id) => document.getElementById(id);

let DATA = null;
let GAME = null;
let UI_STATE = 'setup';
let TOURNAMENT_STRUCTURE = null;

const FORMATIONS = {
  '4-3-3': { label: '4-3-3', slots: [
    { id:'gk', label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'RB', fam:'DF', x:82, y:74 },
    { id:'df2', label:'CB', fam:'DF', x:62, y:78 },
    { id:'df3', label:'CB', fam:'DF', x:38, y:78 },
    { id:'df4', label:'LB', fam:'DF', x:18, y:74 },
    { id:'mf1', label:'CM', fam:'MF', x:68, y:54 },
    { id:'mf2', label:'CM', fam:'MF', x:50, y:58 },
    { id:'mf3', label:'CM', fam:'MF', x:32, y:54 },
    { id:'fw1', label:'RW', fam:'FW', x:78, y:24 },
    { id:'fw2', label:'ST', fam:'FW', x:50, y:16 },
    { id:'fw3', label:'LW', fam:'FW', x:22, y:24 },
  ]},
  '4-4-2': { label: '4-4-2', slots: [
    { id:'gk', label:'GK', fam:'GK', x:50, y:92 },
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
  '3-5-2': { label: '3-5-2', slots: [
    { id:'gk', label:'GK', fam:'GK', x:50, y:92 },
    { id:'df1', label:'CB', fam:'DF', x:72, y:78 },
    { id:'df2', label:'CB', fam:'DF', x:50, y:82 },
    { id:'df3', label:'CB', fam:'DF', x:28, y:78 },
    { id:'mf1', label:'RM', fam:'MF', x:84, y:52 },
    { id:'mf2', label:'CM', fam:'MF', x:60, y:56 },
    { id:'mf3', label:'CM', fam:'MF', x:40, y:56 },
    { id:'mf4', label:'LM', fam:'MF', x:16, y:52 },
    { id:'fw1', label:'ST', fam:'FW', x:60, y:14 },
    { id:'fw2', label:'ST', fam:'FW', x:40, y:14 },
  ]},
};

const WORLD_CUP_2026 = [
  'Mexico', 'Canada', 'USA', 'Argentina', 'Paraguay', 'Uruguay',
  'Colombia', 'Peru', 'Chile', 'Brazil', 'Ecuador', 'Venezuela',
  'France', 'Spain', 'England', 'Germany', 'Netherlands', 'Belgium',
  'Portugal', 'Italy', 'Japan', 'South Korea', 'Australia', 'Saudi Arabia',
];

class Dynasty {
  constructor() {
    this.formation = null;
    this.xi = {};
    this.bench = [];
    this.currentMatch = null;
    this.gameRecord = { wins: 0, draws: 0, losses: 0 };
  }

  setFormation(formKey) {
    this.formation = formKey;
  }
}

function initTournamentStructure() {
  const wcTeams = WORLD_CUP_2026.slice(0, 16);
  const groupA = wcTeams.slice(0, 8);
  const groupB = wcTeams.slice(8, 16);

  TOURNAMENT_STRUCTURE = {
    groups: [
      { name: 'A', teams: groupA.map(t => ({name: t, played: 0, wins: 0})), matches: [] },
      { name: 'B', teams: groupB.map(t => ({name: t, played: 0, wins: 0})), matches: [] },
    ]
  };

  TOURNAMENT_STRUCTURE.groups.forEach(grp => {
    grp.teams.forEach((team1, i) => {
      grp.teams.slice(i + 1).forEach(team2 => {
        grp.matches.push({
          home: team1.name,
          away: team2.name,
          result: null,
          score: [0, 0],
        });
      });
    });
  });
}

async function init() {
  try {
    const resp = await fetch('data.json');
    DATA = await resp.json();
    renderSetup();

    $('resetBtn').addEventListener('click', resetGame);
    $('setupStart').addEventListener('click', startTournament);
    $('changeSquad').addEventListener('click', backToSetup);
    $('newGameBtn').addEventListener('click', resetGame);
  } catch(e) {
    console.error('Failed to load:', e);
  }
}

function renderSetup() {
  const grid = $('formationGrid');
  grid.innerHTML = '';
  for (const [key, form] of Object.entries(FORMATIONS)) {
    const card = document.createElement('button');
    card.className = 'formation-card';
    card.textContent = form.label;
    card.onclick = () => selectFormation(key);
    grid.appendChild(card);
  }

  showScreen('setupScreen');
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
}

function selectFormation(formKey) {
  GAME = new Dynasty();
  GAME.setFormation(formKey);
  updateDraftPreview();
  document.querySelectorAll('.formation-card').forEach(c => c.classList.remove('selected'));
  event.target.classList.add('selected');
  $('setupStart').disabled = false;
}

function updateDraftPreview() {
  if (!GAME?.formation) return;
  const form = FORMATIONS[GAME.formation];
  const posDiv = $('draftPositions');
  posDiv.innerHTML = '';

  form.slots.forEach(slot => {
    const dot = document.createElement('div');
    dot.className = 'position-dot';
    dot.textContent = slot.label;
    dot.style.left = slot.x + '%';
    dot.style.top = slot.y + '%';
    dot.style.transform = 'translate(-50%, -50%)';
    dot.onclick = () => startDraft();
    posDiv.appendChild(dot);
  });

  const benchDiv = $('benchSlots');
  benchDiv.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'bench-slot';
    slot.textContent = `Bench ${i + 1}`;
    slot.onclick = () => startDraft();
    benchDiv.appendChild(slot);
  }
}

function startDraft() {
  showScreen('draftScreen');
  renderDraftScreen();
}

function renderDraftScreen() {
  const squadDiv = $('squadSlots');
  squadDiv.innerHTML = '';
  const form = FORMATIONS[GAME.formation];
  form.slots.forEach(slot => {
    const s = document.createElement('div');
    s.className = 'squad-slot' + (GAME.xi[slot.id] ? ' filled' : '');
    s.textContent = GAME.xi[slot.id]?.n.split(' ')[0] || slot.label;
    squadDiv.appendChild(s);
  });

  const benchDiv = $('benchList');
  benchDiv.innerHTML = '';
  GAME.bench.forEach(p => {
    const b = document.createElement('div');
    b.className = 'bench-item filled';
    b.textContent = p.n.split(' ')[0];
    benchDiv.appendChild(b);
  });

  const teams = [...new Set(DATA.players.filter(p => p.year === 2026).map(p => p.country))].sort();
  const playerDiv = $('playerList');
  playerDiv.innerHTML = '<select id="teamSelect" style="width:100%; padding:8px; margin-bottom:10px;"></select><div></div>';

  const sel = $('teamSelect');
  teams.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });

  sel.onchange = (e) => loadTeamPlayers(e.target.value);
  loadTeamPlayers(teams[0]);
}

function loadTeamPlayers(country) {
  const players = DATA.players.filter(p => p.country === country && p.year === 2026);
  const playerDiv = $('playerList').querySelector('div');
  playerDiv.innerHTML = '';
  $('currentSquad').textContent = country;

  players.forEach(player => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `<span class="player-name">${player.n}</span><span class="player-rating">${player.sp[0]} ${player.o}</span>`;
    row.onclick = () => addPlayerToDraft(player);
    playerDiv.appendChild(row);
  });
}

function addPlayerToDraft(player) {
  const form = FORMATIONS[GAME.formation];
  const emptySlot = form.slots.find(s => !GAME.xi[s.id]);

  if (emptySlot) {
    GAME.xi[emptySlot.id] = player;
  } else if (GAME.bench.length < 5) {
    GAME.bench.push(player);
  }

  renderDraftScreen();
  const allFilled = form.slots.every(s => GAME.xi[s.id]);
  if (allFilled) {
    $('setupStart').disabled = false;
  }
}

function startTournament() {
  initTournamentStructure();
  UI_STATE = 'tournament';
  showScreen('tournamentScreen');
  renderTournament();
}

function renderTournament() {
  const matchesDiv = $('matchesGrid');
  matchesDiv.innerHTML = '';

  TOURNAMENT_STRUCTURE.groups.forEach(grp => {
    grp.matches.forEach(match => {
      const card = document.createElement('div');
      card.className = 'match-card';
      card.innerHTML = `
        <div class="match-card-stage">Group ${grp.name}</div>
        <div class="match-card-teams">
          <div class="match-card-team">${match.home}</div>
          ${match.result ? `<div class="match-card-score">${match.score[0]}-${match.score[1]}</div>` : '<div class="match-card-score">-</div>'}
          <div class="match-card-team">${match.away}</div>
        </div>
        <div class="match-card-status">${match.result ? match.result : 'Upcoming'}</div>
      `;
      card.onclick = () => playMatch(match, grp.name);
      matchesDiv.appendChild(card);
    });
  });
}

function playMatch(match, groupName) {
  showScreen('matchScreen');
  $('yourTeam').textContent = 'Your Team';
  $('oppTeam').textContent = match.away;
  $('matchStage').textContent = `Group ${groupName}`;
  GAME.currentMatch = { match, groupName, homeGoals: 0, awayGoals: 0 };
  renderMatch();
}

function renderMatch() {
  const container = $('playersContainer');
  container.innerHTML = '';
  const form = FORMATIONS[GAME.formation];

  form.slots.forEach(slot => {
    if (GAME.xi[slot.id]) {
      const dot = document.createElement('div');
      dot.className = 'player-icon your-team';
      dot.textContent = GAME.xi[slot.id].n.split(' ')[0][0];
      dot.style.left = (slot.x - 2) + '%';
      dot.style.top = (slot.y - 2) + '%';
      container.appendChild(dot);
    }
  });

  form.slots.forEach(slot => {
    const dot = document.createElement('div');
    dot.className = 'player-icon opp-team';
    dot.textContent = 'O';
    dot.style.left = (100 - slot.x - 2) + '%';
    dot.style.top = (slot.y - 2) + '%';
    container.appendChild(dot);
  });

  $('playMatch').onclick = simulateMatch;
}

function simulateMatch() {
  const yourRating = Object.values(GAME.xi).reduce((sum, p) => sum + (p.o || 72), 0) / 11;
  const oppRating = 74;
  const rng = Math.random();

  let yourGoals = 0, oppGoals = 0;
  if (yourRating > oppRating + 3) {
    yourGoals = rng < 0.65 ? 2 : (rng < 0.85 ? 1 : 0);
    oppGoals = rng < 0.4 ? 0 : (rng < 0.8 ? 1 : 0);
  } else if (yourRating > oppRating) {
    yourGoals = rng < 0.55 ? 1 : 0;
    oppGoals = rng < 0.45 ? 1 : 0;
  } else {
    yourGoals = rng < 0.45 ? 1 : 0;
    oppGoals = rng < 0.55 ? 1 : 0;
  }

  GAME.currentMatch.homeGoals = yourGoals;
  GAME.currentMatch.awayGoals = oppGoals;
  $('yourScore').textContent = yourGoals;
  $('oppScore').textContent = oppGoals;

  const result = yourGoals > oppGoals ? 'W' : (yourGoals < oppGoals ? 'L' : 'D');
  if (result === 'W') GAME.gameRecord.wins++;
  else if (result === 'D') GAME.gameRecord.draws++;
  else GAME.gameRecord.losses++;

  $('matchStats').textContent = `Record: ${GAME.gameRecord.wins}W-${GAME.gameRecord.draws}D-${GAME.gameRecord.losses}L`;
  $('continueBtn').onclick = backToTournament;
}

function backToTournament() {
  GAME.currentMatch.match.result = GAME.currentMatch.homeGoals > GAME.currentMatch.awayGoals ? 'W' : (GAME.currentMatch.homeGoals < GAME.currentMatch.awayGoals ? 'L' : 'D');
  GAME.currentMatch.match.score = [GAME.currentMatch.homeGoals, GAME.currentMatch.awayGoals];
  showScreen('tournamentScreen');
  renderTournament();

  const allPlayed = TOURNAMENT_STRUCTURE.groups.every(g => g.matches.every(m => m.result));
  if (allPlayed) endGame();
}

function endGame() {
  const {wins, draws, losses} = GAME.gameRecord;
  const pts = wins * 3 + draws;
  showScreen('resultsScreen');
  $('resultsHeader').innerHTML = `<h2>Tournament Complete</h2><p>${wins}-${draws}-${losses} (${pts} pts)</p>`;
  $('resultsBody').innerHTML = `<div class="results-summary"><p>Wins: ${wins}</p><p>Draws: ${draws}</p><p>Losses: ${losses}</p></div>`;
}

function backToSetup() {
  GAME = null;
  showScreen('setupScreen');
  renderSetup();
}

function resetGame() {
  GAME = null;
  showScreen('setupScreen');
  renderSetup();
}

document.addEventListener('DOMContentLoaded', init);
