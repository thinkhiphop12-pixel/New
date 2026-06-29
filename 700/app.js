'use strict';

const $ = id => document.getElementById(id);

let DATA = null;
let SQUADS = {};
let COMBOS = [];
let spinning = false;

const FORMATIONS = {
  '4-3-3': [
    {id:'gk',  label:'GK', fam:'GK', x:50, y:92},
    {id:'rb',  label:'RB', fam:'DF', x:82, y:72},
    {id:'cb1', label:'CB', fam:'DF', x:62, y:76},
    {id:'cb2', label:'CB', fam:'DF', x:38, y:76},
    {id:'lb',  label:'LB', fam:'DF', x:18, y:72},
    {id:'cm1', label:'CM', fam:'MF', x:65, y:52},
    {id:'cm2', label:'CM', fam:'MF', x:50, y:56},
    {id:'cm3', label:'CM', fam:'MF', x:35, y:52},
    {id:'rw',  label:'RW', fam:'FW', x:78, y:22},
    {id:'st',  label:'ST', fam:'FW', x:50, y:15},
    {id:'lw',  label:'LW', fam:'FW', x:22, y:22},
  ],
  '4-4-2': [
    {id:'gk',  label:'GK', fam:'GK', x:50, y:92},
    {id:'rb',  label:'RB', fam:'DF', x:82, y:74},
    {id:'cb1', label:'CB', fam:'DF', x:62, y:78},
    {id:'cb2', label:'CB', fam:'DF', x:38, y:78},
    {id:'lb',  label:'LB', fam:'DF', x:18, y:74},
    {id:'rm',  label:'RM', fam:'MF', x:82, y:48},
    {id:'cm1', label:'CM', fam:'MF', x:62, y:52},
    {id:'cm2', label:'CM', fam:'MF', x:38, y:52},
    {id:'lm',  label:'LM', fam:'MF', x:18, y:48},
    {id:'st1', label:'ST', fam:'FW', x:62, y:18},
    {id:'st2', label:'ST', fam:'FW', x:38, y:18},
  ],
  '3-4-3': [
    {id:'gk',  label:'GK', fam:'GK', x:50, y:92},
    {id:'cb1', label:'CB', fam:'DF', x:70, y:76},
    {id:'cb2', label:'CB', fam:'DF', x:50, y:80},
    {id:'cb3', label:'CB', fam:'DF', x:30, y:76},
    {id:'rm',  label:'RM', fam:'MF', x:84, y:50},
    {id:'cm1', label:'CM', fam:'MF', x:62, y:54},
    {id:'cm2', label:'CM', fam:'MF', x:38, y:54},
    {id:'lm',  label:'LM', fam:'MF', x:16, y:50},
    {id:'rw',  label:'RW', fam:'FW', x:76, y:22},
    {id:'st',  label:'ST', fam:'FW', x:50, y:15},
    {id:'lw',  label:'LW', fam:'FW', x:24, y:22},
  ]
};

let SLOTS = [];
let state = null;
let pickOrder = [];

function expandPos(sp2) {
  const out = new Set(sp2 || []);
  (sp2 || []).forEach(p => {
    if (p === 'RM') out.add('RW');
    if (p === 'LM') out.add('LW');
    if (p === 'RW') out.add('RM');
    if (p === 'LW') out.add('LM');
    if (p === 'RB') out.add('RWB');
    if (p === 'LB') out.add('LWB');
  });
  return [...out];
}

function colorFor(country) {
  const map = {
    Brazil: ['#ffcc29','#0a5c36'], Argentina: ['#6cace4','#142a52'], France: ['#0055a4','#fff'],
    Germany: ['#ffffff','#000000'], Spain: ['#aa151b','#f1bf00'], England: ['#ffffff','#1b1b3a'],
    Portugal: ['#cc0000','#fff'], Netherlands: ['#ff6f00','#142a52'], Italy: ['#0066cc','#fff']
  };
  return map[country] || ['#1b5e3a', '#f4efe0'];
}

function initials(n) {
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0].slice(0,2).toUpperCase();
}

function formationMini(key) {
  return FORMATIONS[key].map(s =>
    `<span class="fm-dot" style="left:${s.x}%;top:${s.y}%"></span>`
  ).join('');
}

async function boot() {
  try {
    const r = await fetch('data.json');
    DATA = await r.json();
  } catch(e) {
    $('app').innerHTML = '<div class="boot-err">Failed to load squad data. Serve from a web server.</div>';
    return;
  }

  SQUADS = {};
  for (const p of DATA.players) {
    const k = p.country + '|' + p.year;
    (SQUADS[k] ||= []).push(p);
  }
  COMBOS = Object.keys(SQUADS);

  buildFormations();
  wireUI();
  showSetup();
}

function buildFormations() {
  const grid = $('formationGrid');
  grid.innerHTML = '';
  Object.keys(FORMATIONS).forEach(key => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'formation-card';
    b.innerHTML = `
      <span class="fc-name">${key}</span>
      <span class="fc-mini">${formationMini(key)}</span>`;
    b.dataset.formation = key;
    b.onclick = () => {
      document.querySelectorAll('.formation-card').forEach(el => el.classList.remove('sel'));
      b.classList.add('sel');
      state = { formation: key };
      $('setupStart').disabled = false;
    };
    grid.appendChild(b);
  });
}

function wireUI() {
  $('setupStart').onclick = () => { if (state?.formation) startGame(state.formation); };
  $('spinBtn').onclick = spin;
  $('resetBtn').onclick = () => { if (confirm('Start over?')) showSetup(); };
  $('againBtn').onclick = showSetup;
  $('shareBtn').onclick = share;
  $('undoBtn').onclick = undoPick;
  $('playerSearch').oninput = () => renderPlayers($('playerSearch').value);

  document.addEventListener('keydown', e => {
    if ($('gameScreen').classList.contains('hidden')) {
      if (e.key === 'Enter' && state?.formation && !$('setupStart').disabled) {
        e.preventDefault();
        startGame(state.formation);
      }
      return;
    }
    if (e.key === '/' && document.activeElement !== $('playerSearch')) {
      e.preventDefault();
      $('playerSearch').focus();
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement !== $('playerSearch')) {
      e.preventDefault();
      if (!spinning) spin();
    }
    if ((e.key === 'u' || e.key === 'U') && pickOrder.length) undoPick();
  });
}

function showSetup() {
  state = null;
  pickOrder = [];
  $('setupScreen').classList.remove('hidden');
  $('gameScreen').classList.add('hidden');
  $('resultsScreen').classList.add('hidden');
  $('xiProgressWrap').classList.add('hidden');
  $('roundPill').textContent = '';
  $('undoBtn').classList.add('hidden');
  $('setupStart').disabled = true;
  document.querySelectorAll('.formation-card').forEach(c => c.classList.remove('sel'));
}

function startGame(formation) {
  SLOTS = FORMATIONS[formation];
  state = { formation, picks: {}, currentSquad: null };
  pickOrder = [];
  $('setupScreen').classList.add('hidden');
  $('resultsScreen').classList.add('hidden');
  $('gameScreen').classList.remove('hidden');
  $('xiProgressWrap').classList.remove('hidden');
  $('formationLabel').textContent = formation;
  buildPitch();
  updateProgress();
  $('squadName').textContent = '—';
  $('squadYear').textContent = 'Press spin for a squad offer';
  $('playerPanel').classList.add('dim');
  $('playerList').innerHTML = '';
  $('playerSearch').value = '';
  BK.tap($('gameScreen'));
}

function updateProgress() {
  const done = Object.keys(state.picks).length;
  $('roundPill').textContent = `${done}/11`;
  $('xiProgressLabel').textContent = `${done} / 11 picked`;
  $('xiProgressFill').style.width = `${(done / 11) * 100}%`;
  $('undoBtn').classList.toggle('hidden', !pickOrder.length);

  if (done === 0) {
    $('liveRating').textContent = '—';
    return;
  }
  let sum = 0;
  Object.values(state.picks).forEach(p => { sum += (p.player.o || 65); });
  const avg = (sum / done).toFixed(1);
  $('liveRating').textContent = `XI avg ${avg}`;
}

function buildPitch() {
  const pitch = $('pitch');
  pitch.innerHTML = `
    <div class="pitch-lines">
      <div class="pl-box top"></div><div class="pl-box bot"></div>
      <div class="pl-circle"></div><div class="pl-mid"></div>
    </div>`;
  SLOTS.forEach(slot => {
    const el = document.createElement('div');
    el.className = 'slot';
    el.style.left = slot.x + '%';
    el.style.top = slot.y + '%';
    el.dataset.id = slot.id;
    el.innerHTML = `<div class="slot-label">${slot.label}</div>`;
    el.onclick = () => onSlotClick(slot.id);
    pitch.appendChild(el);
  });
}

function refreshPitch() {
  SLOTS.forEach(s => {
    const el = $('pitch').querySelector(`[data-id="${s.id}"]`);
    if (!el) return;
    const pick = state.picks[s.id];
    if (pick) {
      const [bg] = colorFor(pick.country);
      el.className = 'slot filled anim-pop';
      el.innerHTML = `
        <div class="slot-jersey" style="background:${bg}">${initials(pick.player.n)}</div>
        <div class="slot-ovr">${pick.player.o}</div>
        <div class="slot-name">${pick.player.n.split(' ').pop()}</div>`;
    } else {
      el.className = 'slot';
      el.innerHTML = `<div class="slot-label">${s.label}</div>`;
    }
  });
}

let armedSlot = null;

function onSlotClick(slotId) {
  if (state.picks[slotId]) return;
  armedSlot = slotId;
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('armed'));
  $('pitch').querySelector(`[data-id="${slotId}"]`)?.classList.add('armed');
}

function clearArmed() {
  armedSlot = null;
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('armed'));
}

function bestSlotFor(player) {
  const possible = expandPos(player.sp2 || [player.sp]);
  const avail = SLOTS.filter(s => !state.picks[s.id] && possible.includes(s.label));
  if (!avail.length) return null;
  if (armedSlot) {
    const armed = SLOTS.find(s => s.id === armedSlot);
    if (armed && possible.includes(armed.label)) return armedSlot;
  }
  return avail[0].id;
}

function placePlayer(slotId, player, country, year) {
  state.picks[slotId] = { player, country, year };
  pickOrder.push(slotId);
  refreshPitch();
  updateProgress();
  renderPlayers($('playerSearch').value);
  clearArmed();

  if (Object.keys(state.picks).length >= 11) {
    $('recordCard').classList.add('perfect-glow');
    setTimeout(showResults, 320);
  }
}

function undoPick() {
  const last = pickOrder.pop();
  if (!last || !state.picks[last]) return;
  delete state.picks[last];
  refreshPitch();
  updateProgress();
  renderPlayers($('playerSearch').value);
}

function spin() {
  if (!COMBOS.length || spinning) return;
  spinning = true;
  $('spinBtn').disabled = true;
  $('spinCard').classList.add('spinning');

  const finalKey = COMBOS[Math.floor(Math.random() * COMBOS.length)];
  let ticks = 0;
  const maxTicks = 14;
  const tick = () => {
    const k = COMBOS[Math.floor(Math.random() * COMBOS.length)];
    const [c, y] = k.split('|');
    $('squadName').textContent = c;
    $('squadYear').textContent = `${y} World Cup · spinning…`;
    ticks++;
    if (ticks < maxTicks) {
      setTimeout(tick, 55 + ticks * 8);
    } else {
      const [country, year] = finalKey.split('|');
      state.currentSquad = SQUADS[finalKey] || [];
      state.activeSquadKey = finalKey;
      $('squadName').textContent = country;
      $('squadYear').textContent = `${year} World Cup · ${state.currentSquad.length} players`;
      $('playerPanel').classList.remove('dim');
      $('playerSearch').value = '';
      renderPlayers('');
      $('spinCard').classList.remove('spinning');
      $('spinBtn').disabled = false;
      spinning = false;
      BK.tap($('spinCard'));
    }
  };
  tick();
}

function renderPlayers(filter = '') {
  const list = $('playerList');
  list.innerHTML = '';
  if (!state.currentSquad) return;

  const q = filter.toLowerCase().trim();
  const openSlots = SLOTS.filter(s => !state.picks[s.id]).map(s => s.label);
  let players = [...state.currentSquad].sort((a, b) => (b.o || 0) - (a.o || 0));

  if (q) players = players.filter(p => p.n.toLowerCase().includes(q));

  const frag = document.createDocumentFragment();
  players.forEach(p => {
    const slotId = bestSlotFor(p);
    const fits = slotId && expandPos(p.sp2 || [p.sp]).some(pos => openSlots.includes(pos));
    if (!fits && !q) return;

    const row = document.createElement('div');
    row.className = 'player-row' + (fits ? '' : ' disabled');
    const [bg] = colorFor(p.country);
    const slot = slotId ? SLOTS.find(s => s.id === slotId) : null;
    row.innerHTML = `
      <div class="p-avatar" style="background:${bg}">${initials(p.n)}</div>
      <div class="p-meta">
        <div class="pname">${p.n}</div>
        <div class="p-sub">${(p.sp2||[p.sp]).join('/')} ${slot ? '→ ' + slot.label : ''}</div>
      </div>
      <div class="povr">${p.o}</div>`;
    if (fits) row.onclick = () => selectPlayer(p, slotId);
    frag.appendChild(row);
  });
  list.appendChild(frag);
}

function selectPlayer(player, slotId) {
  if (!slotId) {
    slotId = bestSlotFor(player);
  }
  if (!slotId) return;
  placePlayer(slotId, player, player.country, player.year);
}

function computeRecord() {
  const picks = Object.values(state.picks);
  if (!picks.length) return { W:0, D:0, L:7, S:0 };
  let sum = 0;
  picks.forEach(p => { sum += (p.player.o || 65); });
  const avg = sum / picks.length;
  let W = Math.max(1, Math.min(7, Math.round((avg - 58) / 4.5)));
  let D = Math.max(0, Math.min(3, Math.floor((78 - avg) / 5)));
  let L = 7 - W - D;
  if (L < 0) { L = 0; D = 7 - W; }
  if (avg > 82) { W = 7; D = 0; L = 0; }
  return { W, D, L, S: avg.toFixed(1) };
}

function tierName(r) {
  if (r.W === 7) return '7-0-0 PERFECT';
  if (r.L === 0) return 'UNBEATEN';
  if (r.W >= 5) return 'CHAMPIONS';
  if (r.W >= 3) return 'QUARTER-FINALS';
  return 'GROUP STAGE';
}

function showResults() {
  const r = computeRecord();
  $('gameScreen').classList.add('hidden');
  $('xiProgressWrap').classList.add('hidden');
  $('resultsScreen').classList.remove('hidden');

  $('resultsHead').textContent = r.W === 7 ? 'You went 7-0-0!' : `Projected ${r.W}-${r.D}-${r.L}`;
  $('recW').textContent = r.W;
  $('recD').textContent = r.D;
  $('recL').textContent = r.L;
  $('recordSub').textContent = `Squad average ${r.S} · ${state.formation}`;
  $('tierBadge').textContent = tierName(r);
  $('recordCard').classList.toggle('perfect-glow', r.W === 7);

  const wrap = $('xiList');
  wrap.innerHTML = '';
  SLOTS.forEach(slot => {
    const pick = state.picks[slot.id];
    if (!pick) return;
    const row = document.createElement('div');
    row.className = 'xi-row';
    const [bg] = colorFor(pick.country);
    row.innerHTML = `
      <div class="p-avatar sm" style="background:${bg}">${initials(pick.player.n)}</div>
      <div class="xi-info"><b>${pick.player.n}</b><span>${slot.label} · ${pick.country} ${pick.year}</span></div>
      <div class="xi-ovr">${pick.player.o}</div>`;
    wrap.appendChild(row);
  });

  try { track('700_complete', { record: `${r.W}-${r.D}-${r.L}`, formation: state.formation }); } catch(e) {}
}

function share() {
  const w = $('recW').textContent, d = $('recD').textContent, l = $('recL').textContent;
  BK.share(`I went ${w}-${d}-${l} in 7-0-0 on Ball Knw! Spin World Cup squads and build your XI.`, $('shareBtn'));
}

boot();