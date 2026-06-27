/* Footle — daily football word game */
'use strict';
const $ = (id) => document.getElementById(id);

// Curated 5-letter football words & famous surnames (uppercase) — the daily answers.
const CLEAN = ['GOALS','SAVES','CROSS','SHOTS','PITCH','SQUAD','COACH','BENCH','BOOTS','STUDS',
  'DERBY','DRAWS','SCORE','KEEPS','WINGS','FLAGS','CARDS','MARKS','DIVES','FOULS',
  'GLORY','FINAL','GROUP','TITLE','MEDAL','SHINS','SKILL','SHOOT','CLEAR',
  'MESSI','KROOS','KANTE','RAMOS','COSTA','HENRY','BLANC','NEVES','NASRI','SUKER',
  'PIQUE','VARDY','KEANE','GIGGS','TERRY','BANKS','MOORE','HURST','OWENS'];

const ROWS = 6, COLS = 5;
const KEY = 'bk_footle_v1';

function dayIndex(){
  const epoch = Date.UTC(2024, 0, 1);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - epoch) / 864e5);
}
const DAY = dayIndex();
const ANSWER = CLEAN[((DAY % CLEAN.length) + CLEAN.length) % CLEAN.length];

let guesses = [];     // array of strings
let current = '';
let finished = false;
let won = false;

function loadState(){
  try {
    const s = JSON.parse(localStorage.getItem(KEY)) || {};
    if (s.day === DAY){ guesses = s.guesses || []; finished = !!s.finished; won = !!s.won; }
    return s;
  } catch(e){ return {}; }
}
function saveState(){
  const all = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; } })();
  const merged = Object.assign({}, all, { day: DAY, guesses, finished, won, stats: all.stats });
  try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch(e){}
}
function getStats(){ try { return (JSON.parse(localStorage.getItem(KEY))||{}).stats || { played:0, wins:0, streak:0, max:0, dist:[0,0,0,0,0,0] }; } catch(e){ return { played:0, wins:0, streak:0, max:0, dist:[0,0,0,0,0,0] }; } }
function setStats(st){ const all=(()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return{};}})(); all.stats=st; try{localStorage.setItem(KEY,JSON.stringify(all));}catch(e){} }

function score(guess){
  const res = Array(COLS).fill('absent');
  const a = ANSWER.split('');
  const counts = {};
  a.forEach(c => counts[c] = (counts[c]||0)+1);
  for (let i=0;i<COLS;i++){ if (guess[i]===a[i]){ res[i]='correct'; counts[guess[i]]--; } }
  for (let i=0;i<COLS;i++){ if (res[i]==='correct') continue; const c=guess[i]; if (counts[c]>0){ res[i]='present'; counts[c]--; } }
  return res;
}

function buildBoard(){
  const board = $('board'); board.innerHTML = '';
  for (let r=0;r<ROWS;r++){
    const row = document.createElement('div'); row.className='board-row'; row.id='row-'+r;
    for (let c=0;c<COLS;c++){
      const t = document.createElement('div'); t.className='tile'; t.id=`t-${r}-${c}`;
      row.appendChild(t);
    }
    board.appendChild(row);
  }
}
function renderBoard(animateRow=-1){
  for (let r=0;r<ROWS;r++){
    const g = guesses[r];
    for (let c=0;c<COLS;c++){
      const t = $(`t-${r}-${c}`);
      if (g){
        t.textContent = g[c];
        const sc = score(g);
        t.className = 'tile ' + sc[c];
        if (r===animateRow){ t.classList.add('flip'); t.style.animationDelay = (c*0.12)+'s'; }
      } else if (r===guesses.length){
        t.textContent = current[c] || '';
        t.className = 'tile' + (current[c] ? ' filled pop' : '');
      } else { t.textContent=''; t.className='tile'; }
    }
  }
}

const KB = ['QWERTYUIOP','ASDFGHJKL','⏎ZXCVBNM⌫'];
function buildKeyboard(){
  const kb = $('keyboard'); kb.innerHTML='';
  KB.forEach(rowStr => {
    const row = document.createElement('div'); row.className='kb-row';
    [...rowStr].forEach(ch => {
      const k = document.createElement('button'); k.className='key';
      if (ch==='⏎'){ k.classList.add('wide'); k.textContent='Enter'; k.dataset.k='ENTER'; }
      else if (ch==='⌫'){ k.classList.add('wide'); k.textContent='⌫'; k.dataset.k='BACK'; }
      else { k.textContent=ch; k.dataset.k=ch; k.id='k-'+ch; }
      k.addEventListener('click', () => handleKey(k.dataset.k));
      row.appendChild(k);
    });
    kb.appendChild(row);
  });
}
function paintKeys(){
  const best = {};
  guesses.forEach(g => { const sc=score(g); for (let i=0;i<COLS;i++){ const c=g[i]; const s=sc[i]; const rank={absent:0,present:1,correct:2}; if (!(c in best) || rank[s]>rank[best[c]]) best[c]=s; } });
  for (const c in best){ const k=$('k-'+c); if (k){ k.classList.remove('correct','present','absent'); k.classList.add(best[c]); } }
}

function handleKey(k){
  if (finished) return;
  if (k==='ENTER'){ submit(); return; }
  if (k==='BACK'){ current = current.slice(0,-1); renderBoard(); return; }
  if (/^[A-Z]$/.test(k) && current.length < COLS){ current += k; renderBoard(); }
}
function isValidWord(w){
  // Accept the answer and any football word, plus the English dictionary.
  if (w === ANSWER || CLEAN.includes(w)) return true;
  try { if (window.FOOTLE_VALID) return FOOTLE_VALID.has(w.toLowerCase()); } catch(e){}
  return true; // fail open if dictionary failed to load
}
function submit(){
  if (current.length !== COLS){ toast('Not enough letters'); shakeRow(); return; }
  if (!isValidWord(current)){ toast('Not in word list'); shakeRow(); return; }
  const g = current; guesses.push(g); current='';
  const rowIdx = guesses.length-1;
  renderBoard(rowIdx); paintKeys();
  saveState();
  if (g === ANSWER){ finished=true; won=true; saveState(); recordResult(true); setTimeout(()=>showEnd(), 1400); }
  else if (guesses.length >= ROWS){ finished=true; won=false; saveState(); recordResult(false); setTimeout(()=>showEnd(), 1400); }
}
function shakeRow(){ const row=$('row-'+guesses.length); if(row){ row.style.animation='shake .4s'; setTimeout(()=>row.style.animation='',400);} }

function recordResult(win){
  const all=(()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return{};}})();
  if (all.recordedDay === DAY) return;
  const st = getStats();
  st.played++; if (win){ st.wins++; st.streak++; st.max=Math.max(st.max,st.streak); st.dist[guesses.length-1]++; } else { st.streak=0; }
  setStats(st);
  all.recordedDay = DAY; try{localStorage.setItem(KEY,JSON.stringify(all));}catch(e){}
}

function emojiGrid(){
  return guesses.map(g => score(g).map(s => s==='correct'?'🟩':s==='present'?'🟨':'⬜').join('')).join('\n');
}
function showEnd(){
  try { window.BKDaily && (BKDaily.record('footle'), BKDaily.renderStrip(document.getElementById('dailySlate'),'footle')); } catch(e){}
  const st = getStats();
  const head = won ? `You got it in ${guesses.length}!` : `Today's word was ${ANSWER}`;
  openModal(`
    <h2>${head}</h2>
    <p>${won ? 'Nice — share your grid and come back tomorrow for a new Footle.' : 'Hard luck. A new football word lands tomorrow.'}</p>
    <div class="stat-row">
      <div><div class="sv">${st.played}</div><div class="sl">Played</div></div>
      <div><div class="sv">${st.played?Math.round(st.wins/st.played*100):0}</div><div class="sl">Win %</div></div>
      <div><div class="sv">${st.streak}</div><div class="sl">Streak</div></div>
      <div><div class="sv">${st.max}</div><div class="sl">Max</div></div>
    </div>
    <div class="share-row"><button class="btn btn-primary" id="shareNow">Share result</button></div>
  `);
  $('shareNow').addEventListener('click', share);
}
function share(){
  const txt = `Footle ${won?guesses.length:'X'}/6 · ${new Date().toLocaleDateString('en-GB')}\n${emojiGrid()}\nballknw.com/footle`;
  if (navigator.share) navigator.share({ text: txt }).catch(()=>{});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast('Copied to clipboard'));
  else toast(txt);
}

function openModal(html){
  const host=$('modalHost'), card=$('modalCard');
  card.innerHTML = '<button class="modal-close" id="mClose">×</button>' + html;
  host.classList.remove('hidden');
  $('mClose').addEventListener('click', ()=>host.classList.add('hidden'));
  host.addEventListener('click', (e)=>{ if(e.target===host) host.classList.add('hidden'); });
}
function toast(msg){
  const host=$('toastHost'); const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  host.appendChild(t); requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),300); },1800);
}

function howModal(){
  openModal(`<h2>How to play Footle</h2>
    <p>Guess the hidden 5-letter football word in six tries.</p>
    <ul><li><b>Green</b> — right letter, right spot.</li>
    <li><b>Yellow</b> — right letter, wrong spot.</li>
    <li><b>Grey</b> — letter not in the word.</li></ul>
    <p>Answers are football words and famous surnames. A new puzzle every day.</p>`);
}
function statsModal(){
  const st=getStats();
  openModal(`<h2>Your Footle stats</h2>
    <div class="stat-row">
      <div><div class="sv">${st.played}</div><div class="sl">Played</div></div>
      <div><div class="sv">${st.played?Math.round(st.wins/st.played*100):0}</div><div class="sl">Win %</div></div>
      <div><div class="sv">${st.streak}</div><div class="sl">Streak</div></div>
      <div><div class="sv">${st.max}</div><div class="sl">Max streak</div></div>
    </div>`);
}

function init(){
  loadState();
  buildBoard(); buildKeyboard(); renderBoard(); paintKeys();
  $('puzzleSub').textContent = `Guess the hidden 5-letter football word in six tries · #${DAY}`;
  $('howBtn').addEventListener('click', howModal);
  $('statsBtn').addEventListener('click', statsModal);
  document.addEventListener('keydown', (e) => {
    if ($('modalHost').classList.contains('hidden')===false) return;
    if (e.key==='Enter') handleKey('ENTER');
    else if (e.key==='Backspace') handleKey('BACK');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
  });
  if (finished){ setTimeout(showEnd, 400); }
}
document.addEventListener('DOMContentLoaded', init);
