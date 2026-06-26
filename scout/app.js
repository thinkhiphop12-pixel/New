const CONFED = {
  UEFA: ["Austria","Belgium","Bosnia and Herzegovina","Bulgaria","Croatia","Czech Republic","Denmark","England","Finland","France","Germany","Greece","Iceland","Italy","Netherlands","Northern Ireland","Norway","Poland","Portugal","Republic of Ireland","Romania","Russia","Scotland","Serbia","Serbia and Montenegro","Slovakia","Slovenia","Spain","Sweden","Switzerland","Turkey","Ukraine","Wales"],
  CONMEBOL: ["Argentina","Brazil","Chile","Colombia","Ecuador","Paraguay","Peru","Uruguay"],
  CAF: ["Algeria","Angola","Cameroon","Cape Verde","DR Congo","Egypt","Ghana","Côte d'Ivoire","Morocco","Nigeria","Senegal","South Africa","Togo","Tunisia"],
  AFC: ["Australia","China PR","Iran","Iraq","Japan","Jordan","North Korea","Qatar","Saudi Arabia","South Korea","Uzbekistan"],
  CONCACAF: ["Canada","Costa Rica","Curacao","Haiti","Honduras","Mexico","Panama","Trinidad and Tobago","USA"],
  OFC: ["New Zealand"]
};
const NATION_CONFED = {};
Object.entries(CONFED).forEach(([k, list]) => list.forEach(c => NATION_CONFED[c] = k));

const MAX_GUESSES = 6;
let POOL = [];
let mode = 'daily';
let target = null;
let guesses = [];
let finished = false;
let highlightIdx = -1;

function posGroup(p){
  const pos = String((p.p && p.p[0]) || '').toUpperCase();
  if (pos === 'GK') return 'GK';
  if (pos === 'DF') return 'DF';
  if (pos === 'MF') return 'MF';
  return 'FW';
}
function eraLabel(y){ return y === 'ICON' ? 'Icon' : String(y); }

function dailySeed(){
  const d = new Date();
  const ds = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  let h = 0;
  for (let i=0;i<ds.length;i++) h = (h*31 + ds.charCodeAt(i)) | 0;
  return { key: ds, hash: Math.abs(h) };
}

async function init(){
  try{
    const res = await fetch('../700/data.json');
    const data = await res.json();
    const all = [...(data.players||[]), ...(data.icons||[])];
    const candidates = all.filter(p => p && p.n && (p.icon || p.o >= 78) && typeof p.pac === 'number');
    const byName = new Map();
    candidates.forEach(p => {
      const existing = byName.get(p.n);
      if (!existing || (p.o||0) > (existing.o||0)) byName.set(p.n, p);
    });
    POOL = Array.from(byName.values()).sort((a,b) => a.n.localeCompare(b.n));

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('gameCard').classList.remove('hidden');
    loadStreakStats();
    startDaily();
  }catch(e){
    document.getElementById('loading').textContent = 'Could not load player data. Please refresh.';
  }
}

function loadStreakStats(){
  document.getElementById('streakVal').textContent = localStorage.getItem('scout_streak') || '0';
  document.getElementById('playedVal').textContent = localStorage.getItem('scout_played') || '0';
}

function startDaily(){
  mode = 'daily';
  document.getElementById('modeDaily').classList.add('active');
  document.getElementById('modePractice').classList.remove('active');
  const { key, hash } = dailySeed();
  target = POOL[hash % POOL.length];
  const saved = JSON.parse(localStorage.getItem('scout_daily_' + key) || 'null');
  guesses = [];
  finished = false;
  document.getElementById('modalContainer').innerHTML = '';
  renderEmptyRows();
  renderGuesses();
  document.getElementById('guessInput').disabled = false;
  document.getElementById('introText').innerHTML = `A mystery footballer from World Cup history.
    Type a name below — every guess scores you on <strong>Nation</strong>, <strong>Position</strong>,
    <strong>Era</strong>, <strong>Rating</strong> and <strong>Pace</strong>. Six guesses to find them.`;

  if (saved && saved.names){
    saved.names.forEach(n => {
      const p = POOL.find(x => x.n === n);
      if (p) guesses.push(p);
    });
    renderGuesses();
    if (saved.done){ finished = true; document.getElementById('guessInput').disabled = true; }
  }
  updateGuessCount();
}

function startPractice(){
  mode = 'practice';
  document.getElementById('modeDaily').classList.remove('active');
  document.getElementById('modePractice').classList.add('active');
  target = POOL[Math.floor(Math.random() * POOL.length)];
  guesses = [];
  finished = false;
  document.getElementById('modalContainer').innerHTML = '';
  renderEmptyRows();
  renderGuesses();
  document.getElementById('guessInput').disabled = false;
  document.getElementById('introText').innerHTML = `<strong>Practice mode</strong> — unlimited mystery
    players, doesn't affect your daily streak.`;
  updateGuessCount();
  document.getElementById('guessInput').focus();
}

function updateGuessCount(){
  document.getElementById('guessCountVal').textContent = guesses.length;
}

function renderEmptyRows(){
  const wrap = document.getElementById('emptyRows');
  wrap.innerHTML = '';
  const remaining = Math.max(0, MAX_GUESSES - guesses.length - (finished?0:0));
  for (let i=0;i<Math.max(0, MAX_GUESSES - guesses.length); i++){
    const row = document.createElement('div');
    row.className = 'empty-row';
    wrap.appendChild(row);
  }
}

function numCompare(guessVal, targetVal, closeRange){
  if (guessVal === targetVal) return { cls:'g-exact', arrow:'' };
  const diff = targetVal - guessVal;
  const arrow = diff > 0 ? '&uarr;' : '&darr;';
  if (Math.abs(diff) <= closeRange) return { cls:'g-close', arrow };
  return { cls:'g-far', arrow };
}

function eraCompare(g, t){
  if (g === 'ICON' || t === 'ICON'){
    return g === t ? { cls:'g-exact', arrow:'', label:'Icon' } : { cls:'g-far', arrow:'', label: g==='ICON'?'Icon':String(g) };
  }
  const r = numCompare(g, t, 8);
  return { ...r, label: String(g) };
}

function nationCompare(g, t){
  if (g === t) return { cls:'g-exact', label: g };
  if (NATION_CONFED[g] && NATION_CONFED[g] === NATION_CONFED[t]) return { cls:'g-close', label: g };
  return { cls:'g-far', label: g };
}

function posCompare(g, t){
  const gp = g.sp || posGroup(g);
  const tp = t.sp || posGroup(t);
  if (gp === tp) return { cls:'g-exact', label: gp };
  if (posGroup(g) === posGroup(t)) return { cls:'g-close', label: gp };
  return { cls:'g-far', label: gp };
}

function renderGuesses(){
  const wrap = document.getElementById('guesses');
  wrap.innerHTML = '';
  guesses.forEach(g => wrap.appendChild(buildGuessRow(g)));
  renderEmptyRows();
}

function buildGuessRow(g){
  const row = document.createElement('div');
  row.className = 'guess-row';

  const nameCell = document.createElement('div');
  nameCell.className = 'cell name-cell';
  nameCell.textContent = g.n;
  row.appendChild(nameCell);

  const nat = nationCompare(g.country, target.country);
  row.appendChild(makeCell(nat.cls, g.country, nat.cls==='g-close' ? NATION_CONFED[g.country] : ''));

  const pos = posCompare(g, target);
  row.appendChild(makeCell(pos.cls, pos.label, ''));

  const era = eraCompare(g.year, target.year);
  row.appendChild(makeCell(era.cls, era.label, era.arrow));

  const ovr = numCompare(g.o, target.o, 4);
  row.appendChild(makeCell(ovr.cls, String(g.o), ovr.arrow));

  const pac = numCompare(g.pac, target.pac, 5);
  row.appendChild(makeCell(pac.cls, String(g.pac), pac.arrow));

  return row;
}

function makeCell(cls, val, arrow){
  const cell = document.createElement('div');
  cell.className = 'cell ' + cls;
  cell.innerHTML = `<div class="cv">${val} ${arrow ? '<span class="arrow">'+arrow+'</span>' : ''}</div>`;
  return cell;
}

function submitGuess(p){
  if (finished) return;
  if (guesses.find(x => x.n === p.n)) return;
  guesses.push(p);
  renderGuesses();
  updateGuessCount();
  document.getElementById('guessInput').value = '';
  hideSuggestions();

  const won = p.n === target.n;
  const lost = !won && guesses.length >= MAX_GUESSES;

  if (mode === 'daily'){
    const { key } = dailySeed();
    localStorage.setItem('scout_daily_' + key, JSON.stringify({
      names: guesses.map(x => x.n), done: won || lost
    }));
  }

  if (won || lost){
    finished = true;
    document.getElementById('guessInput').disabled = true;
    if (mode === 'daily') recordDailyResult(won);
    setTimeout(() => showResult(won), 400);
  }
}

function recordDailyResult(won){
  const { key } = dailySeed();
  const lastKey = localStorage.getItem('scout_last_result_date');
  if (lastKey === key) return; // already recorded today
  localStorage.setItem('scout_last_result_date', key);
  const played = parseInt(localStorage.getItem('scout_played') || '0', 10) + 1;
  localStorage.setItem('scout_played', played);
  let streak = parseInt(localStorage.getItem('scout_streak') || '0', 10);
  streak = won ? streak + 1 : 0;
  localStorage.setItem('scout_streak', streak);
  loadStreakStats();
}

function shareGrid(){
  const rows = guesses.map(g => {
    const nat = nationCompare(g.country, target.country).cls;
    const pos = posCompare(g, target).cls;
    const era = eraCompare(g.year, target.year).cls;
    const ovr = numCompare(g.o, target.o, 4).cls;
    const pac = numCompare(g.pac, target.pac, 5).cls;
    const sq = c => c === 'g-exact' ? '🟩' : c === 'g-close' ? '🟨' : '⬛';
    return [nat,pos,era,ovr,pac].map(sq).join('');
  });
  return rows.join('\n');
}

function showResult(won){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const { key } = dailySeed();
  const streak = localStorage.getItem('scout_streak') || '0';
  modal.innerHTML = `
    <div class="modal">
      <h2>${won ? '&#9989; Scouted!' : '&#10060; Not found'}</h2>
      <p>${won ? `Found in <strong>${guesses.length}/${MAX_GUESSES}</strong> guesses.` : `It was <strong>${target.n}</strong> — ${target.country}, ${eraLabel(target.year)} (OVR ${target.o}).`}</p>
      <div class="share-grid">${shareGrid()}</div>
      <div class="modal-stats">
        <div class="ms-box"><div class="v">${streak}</div><div class="l">Streak</div></div>
        <div class="ms-box"><div class="v">${guesses.length}/${MAX_GUESSES}</div><div class="l">Guesses</div></div>
      </div>
      <button class="btn-primary" id="shareBtn">&#128228; Share result</button>
      <div style="margin-top:14px;"><button class="btn-ghost" id="practiceBtn">Play practice round →</button></div>
    </div>`;
  document.getElementById('modalContainer').appendChild(modal);
  document.getElementById('shareBtn').onclick = () => {
    const text = `Scout — ${mode==='daily' ? key : 'Practice'}\n${won ? guesses.length : 'X'}/${MAX_GUESSES}\n${shareGrid()}\n${location.href}`;
    if (navigator.share){ navigator.share({ title:'Scout', text }); }
    else { navigator.clipboard.writeText(text).then(()=>alert('Copied to clipboard!')); }
  };
  document.getElementById('practiceBtn').onclick = () => {
    document.getElementById('modalContainer').innerHTML = '';
    startPractice();
  };
  try{ track('scout_complete', { won, guesses: guesses.length, mode }); }catch(e){}
}

function norm(s){ return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,''); }

function showSuggestions(q){
  const list = document.getElementById('suggestList');
  if (!q){ list.classList.add('hidden'); list.innerHTML=''; return; }
  const nq = norm(q);
  const guessedNames = new Set(guesses.map(g=>g.n));
  const matches = POOL.filter(p => !guessedNames.has(p.n) && norm(p.n).includes(nq)).slice(0, 8);
  if (!matches.length){ list.classList.add('hidden'); list.innerHTML=''; return; }
  list.innerHTML = matches.map((p,i) =>
    `<div class="suggest-item" data-idx="${i}"><span>${p.n}</span><span class="si-meta">${p.country} · ${eraLabel(p.year)}</span></div>`
  ).join('');
  list.classList.remove('hidden');
  highlightIdx = -1;
  Array.from(list.children).forEach((el, i) => {
    el.addEventListener('mousedown', (e) => { e.preventDefault(); submitGuess(matches[i]); });
  });
  list.dataset.matches = JSON.stringify(matches.map(p=>p.n));
}

function hideSuggestions(){
  const list = document.getElementById('suggestList');
  list.classList.add('hidden');
  list.innerHTML = '';
}

const input = document.getElementById('guessInput');
input.addEventListener('input', () => showSuggestions(input.value.trim()));
input.addEventListener('keydown', (e) => {
  const list = document.getElementById('suggestList');
  const items = Array.from(list.children);
  if (e.key === 'ArrowDown'){ e.preventDefault(); highlightIdx = Math.min(items.length-1, highlightIdx+1); updateHi(items); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); highlightIdx = Math.max(0, highlightIdx-1); updateHi(items); }
  else if (e.key === 'Enter'){
    if (highlightIdx >= 0 && items[highlightIdx]){ items[highlightIdx].dispatchEvent(new Event('mousedown')); }
    else {
      const nq = norm(input.value.trim());
      const guessedNames = new Set(guesses.map(g=>g.n));
      const exact = POOL.find(p => !guessedNames.has(p.n) && norm(p.n) === nq);
      if (exact) submitGuess(exact);
    }
  } else if (e.key === 'Escape'){ hideSuggestions(); }
});
function updateHi(items){
  items.forEach((el,i) => el.classList.toggle('hi', i===highlightIdx));
  if (items[highlightIdx]) items[highlightIdx].scrollIntoView({block:'nearest'});
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) hideSuggestions();
});

document.getElementById('modeDaily').onclick = () => { if (mode!=='daily') startDaily(); };
document.getElementById('modePractice').onclick = () => { if (mode!=='practice') startPractice(); };

init();
