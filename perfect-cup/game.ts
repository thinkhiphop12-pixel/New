// Main Game Logic + UI Glue

import {
  createDraftState,
  applySpin,
  applyPick,
  applyReroll,
  canPickCard,
  isComplete,
  lineupBySlot,
  getAvailableRerolls,
  remainingNeeds,
  rerollOptions,
  DEFAULT_RULES,
  type Card,
  type Squad,
} from './engine.js';
import { loadData, getAllSquads, getSquadCards } from './data.js';

const $ = (id: string) => document.getElementById(id)!;

let currentDraft = createDraftState('game-' + Date.now());
let currentSquad: Squad | null = null;

function mountGameUI() {
  const root = $('perfect-cup');
  const shell = document.createElement('div');
  shell.innerHTML = `
    <div id="loading" class="loading">Loading squads…</div>
    <section id="gameScreen" class="hidden">
      <div class="hud">
        <span id="pickCount">0 / 5</span>
        <span id="needs">Need: —</span>
      </div>
      <p id="status" class="status">Spin for your first squad</p>
      <button type="button" class="btn-spin" id="spinBtn">Spin for squad</button>
      <div id="squadPanel" class="squad-card hidden">
        <span id="squadFlag" class="flag"></span>
        <div id="squadName" class="squad-name"></div>
        <div id="squadMeta" class="squad-meta"></div>
        <div id="rerollRow" class="reroll-row"></div>
        <div id="cardList" class="card-grid"></div>
      </div>
      <div class="picks-wrap">
        <div class="picks-label">Your picks</div>
        <div id="picksList" class="picks-list"></div>
      </div>
    </section>
  `;
  root.appendChild(shell);
}

async function initGame() {
  await loadData();
  $('loading').classList.add('hidden');
  $('gameScreen').classList.remove('hidden');
  performFirstSpin();
}

function performFirstSpin() {
  const allSquads = getAllSquads().filter(s => s.eligible);
  if (!allSquads.length) {
    $('status').textContent = 'No squads available';
    return;
  }

  const randomSquad = allSquads[Math.floor(Math.random() * allSquads.length)];
  currentDraft = applySpin(currentDraft, randomSquad.id);
  currentSquad = randomSquad;
  renderUI();
}

function pickCard(card: Card) {
  if (!canPickCard(currentDraft, card)) return alert("Can't pick this card");
  currentDraft = applyPick(currentDraft, card);
  if (isComplete(currentDraft)) {
    showResults();
  } else {
    performFirstSpin();
  }
}

function reroll(kind: 'family' | 'tournament') {
  if (!currentSquad) return;
  const available = getAvailableRerolls(kind, currentSquad, getAllSquads(), currentDraft.seenSquadIds);
  if (available.length === 0) return alert('No more rerolls available');
  const newSquad = available[Math.floor(Math.random() * available.length)];
  currentDraft = applyReroll(currentDraft, kind, newSquad.id);
  currentSquad = newSquad;
  renderUI();
}

function showResults() {
  const lineup = lineupBySlot(currentDraft.picks);
  const html = `
    <div class="results">
      <h2>Perfect Cup Complete!</h2>
      <p>You built a squad of ${currentDraft.picks.length} players.</p>
      <button onclick="startNewGame()" class="reroll-btn">Play Again</button>
    </div>
  `;
  document.getElementById('perfect-cup')!.innerHTML = html;
  console.log('Final lineup:', lineup);
}

function startNewGame() {
  location.reload();
}

function renderUI() {
  const needs = remainingNeeds(currentDraft.picks);
  $('pickCount').textContent = `${currentDraft.picks.length} / ${DEFAULT_RULES.totalPicks}`;
  $('needs').textContent = `Need: GK ${needs.GK} · DEF ${needs.DEF} · MID ${needs.MID} · FWD ${needs.FWD}`;
  $('status').textContent = currentSquad ? 'Pick a player or reroll' : 'Spinning…';
  $('spinBtn').classList.toggle('hidden', !currentSquad);

  const picksEl = $('picksList');
  picksEl.innerHTML = '';
  currentDraft.picks.forEach(card => {
    const chip = document.createElement('div');
    chip.className = 'pick-chip';
    chip.textContent = `${card.position} ${card.name} (${card.rating})`;
    picksEl.appendChild(chip);
  });

  const panel = $('squadPanel');
  if (!currentSquad || !currentDraft.currentSquadId) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  $('squadFlag').textContent = currentSquad.flag;
  $('squadName').textContent = currentSquad.countryName;
  $('squadMeta').textContent = `${currentSquad.tournamentYear} · ${currentSquad.tier} · STR ${currentSquad.strength}`;

  const list = $('cardList');
  list.innerHTML = '';
  getSquadCards(currentSquad.id).forEach(card => {
    const ok = canPickCard(currentDraft, card);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'player-card' + (ok ? '' : ' disabled');
    btn.innerHTML = `<div class="pos">${card.position}</div><div class="name">${card.name}</div><div class="ovr">${card.rating}</div>`;
    if (ok) btn.onclick = () => pickCard(card);
    list.appendChild(btn);
  });

  const rerollRow = $('rerollRow');
  rerollRow.innerHTML = '';
  rerollOptions(currentDraft, currentSquad, getAllSquads()).forEach(opt => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'reroll-btn' + (opt.enabled ? '' : ' disabled');
    b.textContent = opt.used ? `${opt.label} (used)` : opt.label;
    if (opt.enabled && !opt.used) b.onclick = () => reroll(opt.kind);
    rerollRow.appendChild(b);
  });
}

mountGameUI();
$('spinBtn').addEventListener('click', performFirstSpin);
(window as unknown as { startNewGame: () => void }).startNewGame = startNewGame;

initGame().catch(() => {
  $('loading').textContent = 'Failed to load data. Serve over HTTP.';
});