'use strict';

const MODES = {
  classic: { rounds: 10, lives: 3, mult: 1, label: 'Classic' },
  blitz:   { rounds: 15, lives: 1, mult: 2, label: 'Blitz' }
};

let POOL = [], BYGROUP = { GK:[], DEF:[], MID:[], ATT:[] };
let mode = null;
let round = 0, score = 0, streak = 0, lives = 3, answered = false, current = null;
let dataReady = false;

const $ = id => document.getElementById(id);

function posGroup(p) {
  const pos = String(p.sp || (p.p && p.p[0]) || '').toUpperCase();
  if (pos === 'GK') return 'GK';
  if (/CB|RB|LB|RWB|LWB|SW|WB|DF/.test(pos)) return 'DEF';
  if (/CDM|CAM|CM|DM|AM|LM|RM|MF/.test(pos)) return 'MID';
  return 'ATT';
}

function strHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
const NATION_PALETTE = ['#c0392b','#2980b9','#27ae60','#8e44ad','#d35400','#16a085','#2c3e50','#c39bd3','#1f6b3a','#b9770e'];
function nationColor(c) { return NATION_PALETTE[strHash(c) % NATION_PALETTE.length]; }

function heatColor(v) {
  if (v >= 85) return '#2ecc71';
  if (v >= 75) return '#7bc043';
  if (v >= 65) return '#d4ca3a';
  if (v >= 55) return '#e8a13a';
  if (v >= 45) return '#e07b39';
  return '#d04b3a';
}

function eraLabel(year) { return year === 'ICON' ? 'Icon' : String(year); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

async function loadData() {
  if (dataReady) return;
  const res = await fetch('../700/data.json');
  const data = await res.json();
  const all = [...(data.players || []), ...(data.icons || [])];
  POOL = all.filter(p => p && (p.icon || p.o >= 80) && p.n && typeof p.pac === 'number');
  POOL.forEach(p => BYGROUP[posGroup(p)].push(p));
  dataReady = true;
}

function pickRound() {
  const answer = POOL[Math.floor(Math.random() * POOL.length)];
  const grp = posGroup(answer);
  const sameGroup = BYGROUP[grp].filter(p =>
    p.n !== answer.n && Math.abs((p.o || 70) - (answer.o || 70)) <= 8);
  const decoyPool = sameGroup.length >= 3 ? sameGroup : POOL.filter(p => p.n !== answer.n);
  const seen = new Set([answer.n]);
  const finalDecoys = [];
  for (const d of shuffle(decoyPool.slice())) {
    if (finalDecoys.length === 3) break;
    if (!seen.has(d.n)) { seen.add(d.n); finalDecoys.push(d); }
  }
  return { answer, options: shuffle([answer, ...finalDecoys]) };
}

function startMode(key) {
  mode = MODES[key];
  round = 0; score = 0; streak = 0; lives = mode.lives;
  $('modeScreen').classList.add('hidden');
  $('playUI').classList.remove('hidden');
  updateStats();
  $('loading').classList.remove('hidden');
  $('gameCard').classList.add('hidden');
  loadData().then(() => {
    $('loading').classList.add('hidden');
    $('gameCard').classList.remove('hidden');
    BK.tap($('gameCard'));
    nextRound();
  }).catch(() => {
    $('loading').textContent = 'Could not load player data. Refresh to retry.';
  });
}

function nextRound() {
  if (round >= mode.rounds || lives <= 0) return endGame();
  round++;
  answered = false;
  current = pickRound();
  const a = current.answer;
  $('roundPill').textContent = `${mode.label} · ${round}/${mode.rounds}`;
  $('metaPos').textContent = a.sp || (a.p && a.p[0]) || '?';
  const nat = $('metaNation');
  nat.textContent = a.country || '?';
  nat.style.background = nationColor(a.country || '?');
  $('metaEra').textContent = eraLabel(a.year);

  const stats = [['PAC', a.pac], ['SHO', a.sho], ['PAS', a.pas], ['DRI', a.dri], ['DEF', a.def], ['PHY', a.phy]];
  $('heat').innerHTML = stats.map(([lbl, v], i) =>
    `<div class="heat-cell anim-slide" style="background:${heatColor(v)};animation-delay:${i * 40}ms"><div class="hc-lbl">${lbl}</div><div class="hc-val">${v}</div></div>`
  ).join('');

  const opts = $('options');
  opts.innerHTML = '';
  current.options.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opt-btn';
    btn.textContent = o.n;
    btn.dataset.idx = i;
    btn.onclick = () => choose(btn, o);
    opts.appendChild(btn);
  });
  $('nextRow').innerHTML = '';
}

function choose(btn, opt) {
  if (answered) return;
  answered = true;
  const a = current.answer;
  document.querySelectorAll('.opt-btn').forEach(b => {
    b.disabled = true;
    if (b.textContent === a.n) b.classList.add('correct');
  });
  document.querySelectorAll('.heat-cell').forEach(c => c.classList.add('reveal'));

  let note;
  if (opt.n === a.n) {
    streak++;
    const bonus = streak >= 3 ? 50 * mode.mult : 0;
    const pts = (100 + bonus) * mode.mult;
    score += pts;
    note = `Correct — <strong>${a.n}</strong> (${a.country}, OVR ${a.o}). +${pts}${streak >= 3 ? ' 🔥 streak!' : ''}`;
    try { track('heatmap_correct', { streak, mode: mode.label }); } catch(e) {}
  } else {
    btn.classList.add('wrong');
    streak = 0;
    lives--;
    note = `It was <strong>${a.n}</strong> — ${a.country}, ${eraLabel(a.year)} (OVR ${a.o}).`;
    try { track('heatmap_wrong', { mode: mode.label }); } catch(e) {}
  }
  updateStats();
  const last = round >= mode.rounds || lives <= 0;
  $('nextRow').innerHTML =
    `<div class="reveal-note">${note}</div><button type="button" class="btn-primary" id="nextBtn">${last ? 'See results' : 'Next →'}</button>`;
  $('nextBtn').onclick = nextRound;
}

function updateStats() {
  $('scoreVal').textContent = score;
  $('streakVal').textContent = streak;
  const maxLives = mode ? mode.lives : 3;
  $('livesVal').textContent = '❤'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, maxLives - lives));
}

function endGame() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal anim-pop">
      <h2>${lives <= 0 ? 'Out of lives' : 'Run complete'}</h2>
      <p><strong>${score}</strong> points in ${mode.label} mode</p>
      <div class="modal-stats">
        <div class="ms-box"><div class="v">${score}</div><div class="l">Score</div></div>
        <div class="ms-box"><div class="v">${round}</div><div class="l">Rounds</div></div>
      </div>
      <button type="button" class="btn-primary" id="againBtn">Play again</button>
      <p style="margin-top:14px;font-size:13px;color:var(--ink-dim)">More: <a href="../700/">7-0-0</a> · <a href="../scoreline/">Scoreline</a></p>
    </div>`;
  $('modalContainer').appendChild(modal);
  $('againBtn').onclick = () => {
    $('modalContainer').innerHTML = '';
    $('playUI').classList.add('hidden');
    $('modeScreen').classList.remove('hidden');
  };
  try { track('heatmap_complete', { score, rounds: round, mode: mode.label }); } catch(e) {}
}

document.querySelectorAll('.mode-card').forEach(btn => {
  btn.addEventListener('click', () => startMode(btn.dataset.mode));
});

document.addEventListener('keydown', e => {
  if ($('modeScreen').classList.contains('hidden') && !answered && $('gameCard') && !$('gameCard').classList.contains('hidden')) {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) {
      const btn = document.querySelector(`.opt-btn[data-idx="${n - 1}"]`);
      if (btn && !btn.disabled) {
        const opt = current.options[n - 1];
        choose(btn, opt);
      }
    }
  }
  if (e.key === 'Enter' && answered && $('nextBtn')) $('nextBtn').click();
});

updateStats();
loadData();