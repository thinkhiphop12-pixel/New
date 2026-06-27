/* Pitch Strands — daily football word hunt with snaking placement */
'use strict';
const $ = (id) => document.getElementById(id);

const ROWS = 7, COLS = 6;
// Themes: spangram (8-12) + 4-5 words. Keep total <= ROWS*COLS (42).
const THEMES = [
  { clue:'On the ball', spangram:'FOOTBALL', words:['GOAL','PITCH','PASS','SHOT','SAVE'] },
  { clue:'World Cup nations', spangram:'CHAMPIONS', words:['BRAZIL','SPAIN','ITALY','GHANA'] },
  { clue:'In the box', spangram:'PENALTY', words:['KEEPER','POST','DIVE','HANDS','SPOT'] },
  { clue:'Matchday', spangram:'KICKOFF', words:['CROWD','SCARF','PITCH','GOAL','REF'] },
  { clue:'Skills & tricks', spangram:'DRIBBLE', words:['NUTMEG','VOLLEY','FLICK','CHIP'] },
  { clue:'Set the team', spangram:'FORMATION', words:['WINGER','SWEEP','BENCH','CAP'] },
  { clue:'Silverware', spangram:'TROPHY', words:['MEDAL','TREBLE','GLORY','CUP','TITLE'] },
  { clue:'Stadium', spangram:'TERRACE', words:['STAND','TUNNEL','KOP','GATE','TURF'] },
];

const KEY = 'bk_strands_v1';
function dayIndex(){ const e=Date.UTC(2024,0,1); const n=new Date(); return Math.floor((Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())-e)/864e5); }
const DAY = dayIndex();
const THEME = THEMES[((DAY%THEMES.length)+THEMES.length)%THEMES.length];

function mulberry32(a){ return function(){ a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296; }; }

const NEI = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function idx(r,c){ return r*COLS+c; }
function inB(r,c){ return r>=0&&r<ROWS&&c>=0&&c<COLS; }

// Build board: place words via self-avoiding walks. Returns {letters[], placements:{word:[cellIdx...]}}
function buildBoard(seed){
  const all = [THEME.spangram, ...THEME.words].map(w=>w.toUpperCase());
  for (let attempt=0; attempt<300; attempt++){
    const rng = mulberry32(seed + attempt*131);
    const grid = Array(ROWS*COLS).fill(null);
    const placements = {};
    let ok = true;
    for (const word of all){
      let placed = false;
      for (let t=0; t<160 && !placed; t++){
        const cells = walk(word.length, grid, rng);
        if (cells){ placements[word]=cells; cells.forEach((ci,k)=>grid[ci]=word[k]); placed=true; }
      }
      if (!placed){ ok=false; break; }
    }
    if (!ok) continue;
    // fill remaining with random letters
    const ABC='ABCDEFGHIKLMNOPRSTUVWY';
    for (let i=0;i<grid.length;i++) if (grid[i]===null) grid[i]=ABC[Math.floor(rng()*ABC.length)];
    return { letters:grid, placements };
  }
  return null;
}
function walk(len, grid, rng){
  // random start among free cells
  const free=[]; for (let i=0;i<grid.length;i++) if (grid[i]===null) free.push(i);
  if (!free.length) return null;
  const start = free[Math.floor(rng()*free.length)];
  const path=[start]; const used=new Set([start]);
  let cur=start;
  for (let step=1; step<len; step++){
    const r=Math.floor(cur/COLS), c=cur%COLS;
    const opts=[];
    for (const [dr,dc] of NEI){ const nr=r+dr,nc=c+dc; if (inB(nr,nc)){ const ni=idx(nr,nc); if (grid[ni]===null && !used.has(ni)) opts.push(ni); } }
    if (!opts.length) return null;
    const next=opts[Math.floor(rng()*opts.length)];
    path.push(next); used.add(next); cur=next;
  }
  return path;
}

let BOARD = null;
let found = {};         // word -> true
let path = [];          // current selected cell idxs

function load(){ try{ const s=JSON.parse(localStorage.getItem(KEY))||{}; if (s.day===DAY) found=s.found||{}; }catch(e){} }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify({ day:DAY, found })); }catch(e){} }

function wordAtPath(){
  // does current path match a placement exactly (as ordered set)?
  const set = path.slice().sort((a,b)=>a-b).join(',');
  for (const w in BOARD.placements){
    if (found[w]) continue;
    const ps = BOARD.placements[w].slice().sort((a,b)=>a-b).join(',');
    if (ps===set) return w;
  }
  return null;
}

function render(){
  const board=$('board'); board.style.gridTemplateColumns=`repeat(${COLS}, 1fr)`; board.innerHTML='';
  const foundCells={};
  for (const w in found){ if (found[w]) BOARD.placements[w].forEach(ci=>foundCells[ci]=(w===THEME.spangram?'spangram':'found')); }
  for (let i=0;i<BOARD.letters.length;i++){
    const cell=document.createElement('button'); cell.className='strands-cell'; cell.textContent=BOARD.letters[i]; cell.dataset.i=i;
    if (foundCells[i]) cell.classList.add(foundCells[i]);
    if (path.includes(i)) cell.classList.add('active');
    cell.addEventListener('click', ()=>tap(i));
    board.appendChild(cell);
  }
  const total=THEME.words.length+1;
  const got=Object.values(found).filter(Boolean).length;
  $('current').textContent = path.map(i=>BOARD.letters[i]).join('');
  $('progress').textContent = `${got} of ${total} found${found[THEME.spangram]?' · spangram found ✓':''}`;
}
function tap(i){
  if (path.length && path[path.length-1]===i){ path.pop(); render(); return; } // unselect last
  if (path.includes(i)) return;
  if (path.length){
    const last=path[path.length-1]; const lr=Math.floor(last/COLS),lc=last%COLS; const r=Math.floor(i/COLS),c=i%COLS;
    if (Math.abs(lr-r)>1 || Math.abs(lc-c)>1){ path=[i]; render(); return; } // not adjacent -> restart
  }
  path.push(i);
  const w=wordAtPath();
  if (w){ found[w]=true; path=[]; save(); render(); checkWin(); }
  else render();
}
function checkWin(){
  const total=THEME.words.length+1;
  if (Object.values(found).filter(Boolean).length===total){ setTimeout(end,400); }
}
function end(){
  openModal(`<h2>Board cleared!</h2><p>You found every word in <b>“${THEME.clue}”</b>, spangram included. A new theme drops tomorrow.</p>
    <div class="share-row"><button class="btn btn-primary" id="shareNow">Share result</button></div>`);
  $('shareNow').addEventListener('click', share);
}
function share(){
  const txt=`Pitch Strands · ${THEME.clue}\nFound all ${THEME.words.length+1} words 🟦🟩\nballknw.com/strands`;
  if (navigator.share) navigator.share({text:txt}).catch(()=>{});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast('Copied to clipboard'));
  else toast(txt);
}
function openModal(html){ const host=$('modalHost'),card=$('modalCard'); card.innerHTML='<button class="modal-close" id="mClose">×</button>'+html; host.classList.remove('hidden'); $('mClose').addEventListener('click',()=>host.classList.add('hidden')); host.addEventListener('click',e=>{if(e.target===host)host.classList.add('hidden');}); }
function toast(msg){ const h=$('toastHost'); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; h.appendChild(t); requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},1800); }
function howModal(){ openModal(`<h2>How to play Pitch Strands</h2><p>Find every word that fits the day's theme, plus the spangram.</p><ul><li>Tap connected letters (diagonals count) to trace a word.</li><li>Theme words lock green; the spangram locks blue and touches two sides.</li><li>Tap the last letter again to step back, or press Clear.</li></ul>`); }

function init(){
  load();
  BOARD = buildBoard(DAY*977+17);
  if (!BOARD){ $('board').innerHTML='<p>Could not build today\'s board. Please refresh.</p>'; return; }
  $('clue').textContent = '“'+THEME.clue+'”';
  $('clearBtn').addEventListener('click', ()=>{ path=[]; render(); });
  $('howBtn').addEventListener('click', howModal);
  render();
  const total=THEME.words.length+1;
  if (Object.values(found).filter(Boolean).length===total) setTimeout(end,400);
}
document.addEventListener('DOMContentLoaded', init);
