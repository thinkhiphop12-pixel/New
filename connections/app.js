/* Connections XI — daily football grouping game */
'use strict';
const $ = (id) => document.getElementById(id);

// Each puzzle: 4 categories ordered easy->hard. Items must partition uniquely.
const PUZZLES = [
  [
    { cat:'World Cup-winning nations', items:['ITALY','SPAIN','ARGENTINA','URUGUAY'] },
    { cat:'Premier League clubs', items:['ARSENAL','CHELSEA','LIVERPOOL','EVERTON'] },
    { cat:'Playing positions', items:['STRIKER','WINGER','SWEEPER','KEEPER'] },
    { cat:'Skills & tricks', items:['NUTMEG','RABONA','VOLLEY','HEADER'] },
  ],
  [
    { cat:'Legendary goalkeepers', items:['NEUER','BUFFON','CASILLAS','KAHN'] },
    { cat:'Brazilian forwards', items:['RONALDO','ROMARIO','RIVALDO','BEBETO'] },
    { cat:'Famous stadiums', items:['ANFIELD','WEMBLEY','BERNABEU','MARACANA'] },
    { cat:'England captains', items:['TERRY','GERRARD','BECKHAM','KANE'] },
  ],
  [
    { cat:'Ballon d\'Or winners', items:['MODRIC','KAKA','OWEN','SHEVCHENKO'] },
    { cat:'Italian clubs', items:['JUVENTUS','NAPOLI','ROMA','LAZIO'] },
    { cat:'Match officials & cards', items:['REFEREE','LINESMAN','YELLOW','OFFSIDE'] },
    { cat:'Cup competitions', items:['TREBLE','DOUBLE','SHIELD','QUADRUPLE'] },
  ],
  [
    { cat:'Host countries 2002–2022', items:['JAPAN','GERMANY','QATAR','RUSSIA'] },
    { cat:'French champions', items:['ZIDANE','HENRY','PLATINI','MBAPPE'] },
    { cat:'Parts of a goal', items:['POST','CROSSBAR','NET','LINE'] },
    { cat:'Set pieces', items:['CORNER','PENALTY','THROW','FREEKICK'] },
  ],
  [
    { cat:'Madrid galácticos', items:['FIGO','RAUL','ROBERTO','ZIDANE'] },
    { cat:'German clubs', items:['BAYERN','DORTMUND','SCHALKE','LEVERKUSEN'] },
    { cat:'Wingers', items:['RIBERY','ROBBEN','BALE','SANE'] },
    { cat:'On the pitch', items:['CENTRE','PENALTYBOX','TUNNEL','DUGOUT'] },
  ],
  [
    { cat:'Golden Boot strikers', items:['MULLER','LINEKER','KLOSE','VILLA'] },
    { cat:'Spanish clubs', items:['BARCELONA','SEVILLA','VALENCIA','BETIS'] },
    { cat:'Defenders', items:['MALDINI','CANNAVARO','RAMOS','BARESI'] },
    { cat:'Tournaments', items:['EUROS','COPA','NATIONS','CLASICO'] },
  ],
  [
    { cat:'Dutch greats', items:['CRUYFF','GULLIT','BERGKAMP','SNEIJDER'] },
    { cat:'African nations', items:['NIGERIA','GHANA','SENEGAL','MOROCCO'] },
    { cat:'Midfield engines', items:['KANTE','PIRLO','XAVI','MODRIC'] },
    { cat:'Stadium areas', items:['STAND','TERRACE','KOP','TOUCHLINE'] },
  ],
  [
    { cat:'Argentine icons', items:['MARADONA','MESSI','BATISTUTA','KEMPES'] },
    { cat:'London clubs', items:['ARSENAL','TOTTENHAM','FULHAM','PALACE'] },
    { cat:'Goal celebrations', items:['KNEESLIDE','SOMERSAULT','SHIRTOFF','SHUSH'] },
    { cat:'Refereeing tools', items:['WHISTLE','FLAG','CARD','VAR'] },
  ],
];

const KEY = 'bk_conn_v1';
function dayIndex(){ const e=Date.UTC(2024,0,1); const n=new Date(); return Math.floor((Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())-e)/864e5); }
const DAY = dayIndex();
const PUZZLE = PUZZLES[((DAY % PUZZLES.length)+PUZZLES.length)%PUZZLES.length];

function mulberry32(a){ return function(){ a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296; }; }
function shuffle(arr, rng){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

let allItems = [];
let order = [];
let selected = new Set();
let solved = [];        // [{level, cat, items}]
let mistakes = 0;
let finished = false;
let guessHistory = [];

function catOf(item){ for (let i=0;i<4;i++){ if (PUZZLE[i].items.includes(item)) return i; } return -1; }

function load(){
  try { const s=JSON.parse(localStorage.getItem(KEY))||{}; if (s.day===DAY){ solved=s.solved||[]; mistakes=s.mistakes||0; finished=!!s.finished; guessHistory=s.guessHistory||[]; order=s.order||[]; } } catch(e){}
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify({ day:DAY, solved, mistakes, finished, guessHistory, order })); }catch(e){} }

function render(){
  // solved banners
  const sh=$('solvedHost'); sh.innerHTML='';
  solved.forEach(s => {
    const d=document.createElement('div'); d.className='conn-solved lvl-'+s.level;
    d.innerHTML=`<span class="cs-cat">${s.cat}</span><span class="cs-items">${s.items.join(' · ')}</span>`;
    sh.appendChild(d);
  });
  // grid of remaining
  const solvedItems=new Set(solved.flatMap(s=>s.items));
  const remaining = order.filter(it=>!solvedItems.has(it));
  const grid=$('grid'); grid.innerHTML='';
  remaining.forEach(it => {
    const b=document.createElement('button'); b.className='conn-tile'+(selected.has(it)?' sel':''); b.textContent=it;
    b.addEventListener('click', ()=>toggle(it));
    grid.appendChild(b);
  });
  // mistakes
  const mh=$('mistakes'); mh.innerHTML='Mistakes remaining: ';
  for (let i=0;i<4;i++){ const d=document.createElement('span'); d.className='dot'+(i<mistakes?' gone':''); mh.appendChild(d); }
  $('submitBtn').disabled = selected.size!==4 || finished;
}
function toggle(it){
  if (finished) return;
  if (selected.has(it)) selected.delete(it);
  else if (selected.size<4) selected.add(it);
  render();
}
function submit(){
  if (selected.size!==4) return;
  const sel=[...selected];
  const cats=sel.map(catOf);
  guessHistory.push(cats.map(c=>c).join(''));
  if (cats.every(c=>c===cats[0])){
    const lvl=cats[0];
    solved.push({ level:lvl, cat:PUZZLE[lvl].cat, items:PUZZLE[lvl].items.slice() });
    solved.sort((a,b)=>a.level-b.level);
    selected.clear(); save(); render();
    if (solved.length===4){ finished=true; save(); setTimeout(end,500); }
  } else {
    // one-away?
    const counts={}; cats.forEach(c=>counts[c]=(counts[c]||0)+1);
    const near=Object.values(counts).some(v=>v===3);
    mistakes++; save();
    document.querySelectorAll('.conn-tile.sel').forEach(t=>{ t.classList.add('shake'); setTimeout(()=>t.classList.remove('shake'),400); });
    if (near) toast('One away…');
    if (mistakes>=4){ revealAll(); finished=true; save(); setTimeout(end,700); }
    else render();
  }
}
function revealAll(){
  const got=new Set(solved.map(s=>s.level));
  PUZZLE.forEach((c,i)=>{ if(!got.has(i)) solved.push({ level:i, cat:c.cat, items:c.items.slice() }); });
  solved.sort((a,b)=>a.level-b.level); selected.clear(); render();
}
function end(){
  const won = mistakes<4;
  openModal(`<h2>${won?'Solved it!':'Out of guesses'}</h2>
    <p>${won?'Great grouping — share your result and return tomorrow.':'The grid is revealed above. A new Connections XI lands tomorrow.'}</p>
    <div class="share-row"><button class="btn btn-primary" id="shareNow">Share result</button></div>`);
  $('shareNow').addEventListener('click', share);
}
function share(){
  const sq={0:'🟨',1:'🟩',2:'🟦',3:'🟪'};
  const lines = guessHistory.map(g=>[...g].map(c=>sq[c]).join('')).join('\n');
  const txt=`Connections XI · ${new Date().toLocaleDateString('en-GB')}\n${lines}\nballknw.com/connections`;
  if (navigator.share) navigator.share({text:txt}).catch(()=>{});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast('Copied to clipboard'));
  else toast(txt);
}
function openModal(html){
  const host=$('modalHost'),card=$('modalCard');
  card.innerHTML='<button class="modal-close" id="mClose">×</button>'+html;
  host.classList.remove('hidden');
  $('mClose').addEventListener('click',()=>host.classList.add('hidden'));
  host.addEventListener('click',e=>{if(e.target===host)host.classList.add('hidden');});
}
function toast(msg){ const h=$('toastHost'); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; h.appendChild(t); requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},1800); }
function howModal(){ openModal(`<h2>How to play Connections XI</h2><p>Sort the sixteen names into four groups of four.</p><ul><li>Select four tiles and press Submit.</li><li>Each group shares a hidden football theme.</li><li>Four mistakes allowed. Colours: yellow easiest → purple trickiest.</li></ul>`); }

function init(){
  allItems = PUZZLE.flatMap(c=>c.items);
  load();
  if (!order || order.length!==16){ order = shuffle(allItems, mulberry32(DAY*7+13)); save(); }
  $('puzzleSub').textContent = `Find four groups of four · #${DAY}`;
  $('submitBtn').addEventListener('click', submit);
  $('deselectBtn').addEventListener('click', ()=>{ selected.clear(); render(); });
  $('shuffleBtn').addEventListener('click', ()=>{ order = shuffle(order, mulberry32(Date.now())); render(); });
  $('howBtn').addEventListener('click', howModal);
  render();
  if (finished) setTimeout(end,400);
}
document.addEventListener('DOMContentLoaded', init);
