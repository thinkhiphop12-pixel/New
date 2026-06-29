'use strict';

const MODES = {
  classic: { rounds: 10, lives: 3, mult: 1, label: 'Classic' },
  blitz:   { rounds: 15, lives: 1, mult: 2, label: 'Blitz' }
};

/* Curated iconic World Cup scorelines — finals, semis, and famous upsets */
const MATCHES = [
  { home: 'Argentina', away: 'France', year: 2022, stage: 'Final', score: '3-3' },
  { home: 'France', away: 'Croatia', year: 2018, stage: 'Final', score: '4-2' },
  { home: 'Germany', away: 'Argentina', year: 2014, stage: 'Final', score: '1-0' },
  { home: 'Germany', away: 'Brazil', year: 2014, stage: 'Semi-final', score: '7-1' },
  { home: 'Spain', away: 'Netherlands', year: 2010, stage: 'Final', score: '1-0' },
  { home: 'Italy', away: 'France', year: 2006, stage: 'Final', score: '1-1' },
  { home: 'Brazil', away: 'Germany', year: 2002, stage: 'Final', score: '2-0' },
  { home: 'France', away: 'Brazil', year: 1998, stage: 'Final', score: '3-0' },
  { home: 'Brazil', away: 'Italy', year: 1994, stage: 'Final', score: '0-0' },
  { home: 'Germany', away: 'Argentina', year: 1990, stage: 'Final', score: '1-0' },
  { home: 'Argentina', away: 'West Germany', year: 1986, stage: 'Final', score: '3-2' },
  { home: 'Italy', away: 'West Germany', year: 1982, stage: 'Final', score: '3-1' },
  { home: 'Argentina', away: 'Netherlands', year: 1978, stage: 'Final', score: '3-1' },
  { home: 'Netherlands', away: 'West Germany', year: 1974, stage: 'Final', score: '2-1' },
  { home: 'Brazil', away: 'Italy', year: 1970, stage: 'Final', score: '4-1' },
  { home: 'England', away: 'West Germany', year: 1966, stage: 'Final', score: '4-2' },
  { home: 'Saudi Arabia', away: 'Argentina', year: 2022, stage: 'Group stage', score: '2-1' },
  { home: 'Japan', away: 'Germany', year: 2022, stage: 'Group stage', score: '2-1' },
  { home: 'Morocco', away: 'Belgium', year: 2022, stage: 'Group stage', score: '2-0' },
  { home: 'Croatia', away: 'Brazil', year: 2022, stage: 'Quarter-final', score: '1-1' },
  { home: 'Netherlands', away: 'Spain', year: 2014, stage: 'Group stage', score: '5-1' },
  { home: 'Uruguay', away: 'Italy', year: 2014, stage: 'Group stage', score: '1-0' },
  { home: 'Netherlands', away: 'Brazil', year: 2010, stage: 'Quarter-final', score: '2-1' },
  { home: 'Ghana', away: 'Uruguay', year: 2010, stage: 'Quarter-final', score: '1-1' },
  { home: 'South Korea', away: 'Italy', year: 2002, stage: 'Round of 16', score: '2-1' },
  { home: 'Senegal', away: 'France', year: 2002, stage: 'Group stage', score: '1-0' },
  { home: 'USA', away: 'England', year: 1950, stage: 'Group stage', score: '1-0' },
  { home: 'North Korea', away: 'Italy', year: 1966, stage: 'Group stage', score: '1-0' },
  { home: 'Argentina', away: 'England', year: 1986, stage: 'Quarter-final', score: '2-1' },
  { home: 'West Germany', away: 'Hungary', year: 1954, stage: 'Final', score: '3-2' },
  { home: 'Brazil', away: 'Sweden', year: 1958, stage: 'Final', score: '5-2' },
  { home: 'Portugal', away: 'North Korea', year: 2010, stage: 'Group stage', score: '7-0' },
  { home: 'Germany', away: 'Portugal', year: 2014, stage: 'Group stage', score: '4-0' },
  { home: 'Spain', away: 'Netherlands', year: 2014, stage: 'Group stage', score: '1-5' },
];

const $ = id => document.getElementById(id);
let mode = null, round = 0, score = 0, streak = 0, lives = 3;
let answered = false, current = null, usedIds = new Set();

function parseScore(s) {
  const [a, b] = s.split('-').map(Number);
  return [a, b];
}

function fmtScore(h, a) { return `${h}-${a}`; }

function decoysFor(match) {
  const [h, a] = parseScore(match.score);
  const pool = new Set([match.score]);
  const variants = [
    [h + 1, a], [h, a + 1], [h - 1, a], [h, a - 1],
    [h + 2, a], [h, a + 2], [a, h], [h + 1, a + 1],
    [Math.max(0, h - 2), a], [h, Math.max(0, a - 2)],
    [h, a + 3], [h + 3, a], [1, 0], [2, 1], [0, 0]
  ];
  for (const [x, y] of variants) {
    if (x >= 0 && y >= 0 && x <= 9 && y <= 9) pool.add(fmtScore(x, y));
  }
  const arr = [...pool].filter(s => s !== match.score);
  shuffle(arr);
  return arr.slice(0, 3);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickMatch() {
  let avail = MATCHES.filter((_, i) => !usedIds.has(i));
  if (!avail.length) {
    usedIds.clear();
    avail = MATCHES;
  }
  const m = avail[Math.floor(Math.random() * avail.length)];
  const idx = MATCHES.indexOf(m);
  usedIds.add(idx);
  const wrong = decoysFor(m);
  return { match: m, options: shuffle([m.score, ...wrong]) };
}

function teamColors(name) {
  const map = {
    Argentina: '#75AADB', Brazil: '#009B3A', France: '#0055A4', Germany: '#000',
    Italy: '#0066CC', Spain: '#C60B1E', England: '#CF081F', Netherlands: '#FF6600',
    Portugal: '#DA291C', Croatia: '#FF0000', Belgium: '#EAB818', Uruguay: '#5B92E5',
    Mexico: '#006847', Japan: '#BC002D', Morocco: '#C1272D', 'Saudi Arabia': '#006C35',
    Ghana: '#006B3F', Senegal: '#00853F', 'South Korea': '#0047A0', USA: '#3C3B6E',
    Sweden: '#FECC02', Hungary: '#CE2939', 'West Germany': '#000', 'North Korea': '#024FA2'
  };
  for (const [k, v] of Object.entries(map)) {
    if (name.includes(k) || k.includes(name)) return v;
  }
  return '#2a6b45';
}

function startMode(key) {
  mode = MODES[key];
  round = 0; score = 0; streak = 0; lives = mode.lives;
  usedIds.clear();
  $('modeScreen').classList.add('hidden');
  $('playUI').classList.remove('hidden');
  updateStats();
  nextRound();
  BK.tap($('gameCard'));
}

function renderMatch(m) {
  const hc = teamColors(m.home);
  const ac = teamColors(m.away);
  $('matchCard').innerHTML = `
    <div class="mc-stage">${m.year} · ${m.stage}</div>
    <div class="mc-teams">
      <div class="mc-team"><span class="mc-dot" style="background:${hc}"></span>${m.home}</div>
      <div class="mc-vs">vs</div>
      <div class="mc-team"><span class="mc-dot" style="background:${ac}"></span>${m.away}</div>
    </div>
    <div class="mc-prompt">What was the score?</div>`;
}

function nextRound() {
  if (round >= mode.rounds || lives <= 0) return endGame();
  round++;
  answered = false;
  current = pickMatch();
  const m = current.match;
  $('roundPill').textContent = `${mode.label} · ${round}/${mode.rounds}`;
  renderMatch(m);

  const opts = $('options');
  opts.innerHTML = '';
  current.options.forEach((sc, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'score-btn';
    btn.textContent = sc;
    btn.dataset.idx = i;
    btn.onclick = () => choose(btn, sc);
    opts.appendChild(btn);
  });
  $('nextRow').innerHTML = '';
  $('gameCard').classList.remove('hidden');
}

function choose(btn, pick) {
  if (answered) return;
  answered = true;
  const correct = current.match.score;
  document.querySelectorAll('.score-btn').forEach(b => {
    b.disabled = true;
    if (b.textContent === correct) b.classList.add('correct');
  });

  let note;
  if (pick === correct) {
    streak++;
    const bonus = streak >= 3 ? 50 * mode.mult : 0;
    const pts = (100 + bonus) * mode.mult;
    score += pts;
    note = `Correct — <strong>${correct}</strong>. +${pts}${streak >= 3 ? ' 🔥 streak!' : ''}`;
    try { track('scoreline_correct', { streak, mode: mode.label }); } catch (e) {}
  } else {
    btn.classList.add('wrong');
    streak = 0;
    lives--;
    note = `It was <strong>${correct}</strong> — ${current.match.home} vs ${current.match.away}, ${current.match.year}.`;
    try { track('scoreline_wrong', { mode: mode.label }); } catch (e) {}
  }
  updateStats();
  const last = round >= mode.rounds || lives <= 0;
  $('nextRow').innerHTML =
    `<div class="reveal-note">${note}</div><button type="button" class="btn-primary" id="nextBtn">${last ? 'See results' : 'Next match →'}</button>`;
  $('nextBtn').onclick = nextRound;
}

function updateStats() {
  $('scoreVal').textContent = score;
  $('streakVal').textContent = streak;
  const max = mode ? mode.lives : 3;
  $('livesVal').textContent = '❤'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, max - lives));
}

function endGame() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal anim-pop">
      <h2>${lives <= 0 ? 'Out of lives' : 'Run complete'}</h2>
      <p><strong>${score}</strong> points · ${mode.label} mode</p>
      <div class="modal-stats">
        <div class="ms-box"><div class="v">${score}</div><div class="l">Score</div></div>
        <div class="ms-box"><div class="v">${round}</div><div class="l">Matches</div></div>
      </div>
      <button type="button" class="btn-primary" id="againBtn">Play again</button>
      <button type="button" class="btn-ghost" id="shareBtn" style="margin-top:10px">Share result</button>
      <p class="modal-more">More: <a href="../700/">7-0-0</a> · <a href="../lineup/">Lineup</a></p>
    </div>`;
  $('modalContainer').appendChild(modal);
  $('againBtn').onclick = () => {
    $('modalContainer').innerHTML = '';
    $('playUI').classList.add('hidden');
    $('modeScreen').classList.remove('hidden');
  };
  $('shareBtn').onclick = () => {
    BK.share(`I scored ${score} in Scoreline on Ball Knw! Guess iconic World Cup scorelines.`, $('shareBtn'));
  };
  try { track('scoreline_complete', { score, rounds: round, mode: mode.label }); } catch (e) {}
}

document.querySelectorAll('.mode-card').forEach(btn => {
  btn.addEventListener('click', () => startMode(btn.dataset.mode));
});

document.addEventListener('keydown', e => {
  if ($('modeScreen').classList.contains('hidden') && !answered && !$('gameCard').classList.contains('hidden')) {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) {
      const btn = document.querySelector(`.score-btn[data-idx="${n - 1}"]`);
      if (btn && !btn.disabled) choose(btn, btn.textContent);
    }
  }
  if (e.key === 'Enter' && answered && $('nextBtn')) $('nextBtn').click();
});

updateStats();