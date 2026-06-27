/* Starting XI — daily football Letter Boxed */
'use strict';
const $ = (id) => document.getElementById(id);

// Verified solvable puzzles: sides (4×3) + a known 2-word football solution.
const PUZZLES = [
  { sides:[['A','C','E'],['G','H','I'],['M','O','U'],['N','P','T']], sol:['CHAMPION','NUTMEG'] },
  { sides:[['A','D','G'],['C','I','O'],['K','N','R'],['L','T','U']], sol:['TACKLING','GROUND'] },
  { sides:[['A','G','I'],['C','L','N'],['K','O','P'],['R','T','U']], sol:['TACKLING','GROUP'] },
  { sides:[['A','D','G'],['E','I','M'],['L','N','W'],['O','R','S']], sol:['WONDERGOAL','LINESMAN'] },
  { sides:[['A','E','H'],['D','M','O'],['I','P','T'],['R','S','U']], sol:['TROPHIES','STADIUM'] },
  { sides:[['A','E','I'],['G','K','L'],['M','P','S'],['R','T','Y']], sol:['PLAYMAKER','REGISTA'] },
  { sides:[['A','E','F'],['H','I','Q'],['L','M','R'],['S','T','U']], sol:['HALFTIME','EQUALISER'] },
  { sides:[['A','B','D'],['E','I','O'],['L','M','T'],['R','U','X']], sol:['DOUBLE','EXTRATIME'] },
];

// Accepted football words (the dictionary). Solutions are included.
const DICT = new Set(`GOAL GOALS GOALKEEPER KEEPER NUTMEG TACKLE TACKLING GROUP GROUND SHOOT SHOOTOUT
CHAMPION CHAMPIONS SWEEPER RELEGATION CROSSBAR GOALPOST WONDERGOAL LINESMAN REFEREE WHISTLE PENALTY
CORNER OFFSIDE FORMATION DRIBBLE VOLLEY WINGER WINGBACK FULLBACK STRIKER STADIUM CAPTAIN MANAGER
FIXTURE TROPHY LEAGUE HEADER LIBERO PITCH TERRACE TUNNEL DUGOUT SCARF KICKOFF HALFTIME EXTRATIME
HANDBALL FREEKICK THROWIN GOALLINE PASSING SHOOTING MARKING CLEARANCE EQUALISER DERBY RIVALRY
PROMOTION TRANSFER ACADEMY KITMAN PHYSIO TREBLE DOUBLE QUARTER FINAL SEMI WINNER GLORY PLAYMAKER
TROPHIES TROPHY MIDTABLE EXTRATIME GROUND REGISTA HALFTIME EQUALISER WONDERGOAL LINESMAN STADIUM
TARGETMAN STOPPAGE INJURY SUBSTITUTE TACTICS PRESSING COUNTER ANCHORMAN ENGANCHE REGISTA
GOAL KICK NET REF CUP WIN RUN TAP TIP TOE PEG TEAM CLUB CAP CAPS LOB LOT TON NOTE TONE GATE
RAKE LAKE LANE PLAN PLANE GROAN GROUNDOUT KNEE TOECAP REGAL ANGLE TANGLE GLEAN PLEA REAP REAPER
TANK RANK LARK PARK PLANK CRANK PRANK GRAPE GRAPPLE NAPPER LAGER EAGLE LEAGUE PEARL`
  .toUpperCase().split(/\s+/).filter(Boolean));

const KEY = 'bk_lb_v1';
function dayIndex(){ const e=Date.UTC(2024,0,1); const n=new Date(); return Math.floor((Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())-e)/864e5); }
function paramDay(){ try{ var u=new URL(location.href); var d=u.searchParams.get('d'); if(d!==null){ var n=parseInt(d,10); if(!isNaN(n)) return Math.max(0, Math.min(dayIndex(), n)); } }catch(e){} return dayIndex(); }
const DAY = paramDay();
const IS_TODAY = (DAY === dayIndex());
const PUZZLE = PUZZLES[((DAY%PUZZLES.length)+PUZZLES.length)%PUZZLES.length];

// Map letter -> side index
const SIDE_OF = {};
PUZZLE.sides.forEach((s,i)=>s.forEach(c=>SIDE_OF[c]=i));
const ALL_LETTERS = PUZZLE.sides.flat();

let words = [];       // committed words
let current = '';     // current word
let curSeq = [];      // letters of current

function load(){ try{ const s=JSON.parse(localStorage.getItem(KEY))||{}; if (s.day===DAY){ words=s.words||[]; } }catch(e){} }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify({ day:DAY, words })); }catch(e){} }

function usedLetters(){ const set=new Set(); words.forEach(w=>[...w].forEach(c=>set.add(c))); return set; }

// dot positions around the square (percent of stage)
function dotPositions(){
  // top(3): y=12 across x 50/180/... compute on a 320 box with inset 40
  const pos=[];
  const top=[28,50,72], side=[28,50,72];
  // side 0 = top, 1 = right, 2 = bottom, 3 = left
  top.forEach(x=>pos.push([x,12]));      // top row, side index 0
  side.forEach(y=>pos.push([88,y]));     // right col, side index 1
  top.forEach(x=>pos.push([100-x,88]));  // bottom row, side index 2
  side.forEach(y=>pos.push([12,100-y])); // left col, side index 3
  return pos;
}

function render(){
  const stage=$('stage');
  stage.querySelectorAll('.lb-dot').forEach(d=>d.remove());
  const positions=dotPositions();
  const used=usedLetters();
  let k=0;
  PUZZLE.sides.forEach((s)=>{
    s.forEach((c)=>{
      const [x,y]=positions[k++];
      const dot=document.createElement('button'); dot.className='lb-dot'; dot.textContent=c;
      dot.style.left=x+'%'; dot.style.top=y+'%';
      if (used.has(c)) dot.classList.add('used');
      if (curSeq.includes(c)) dot.classList.add('active');
      dot.addEventListener('click', ()=>tap(c));
      stage.appendChild(dot);
    });
  });
  $('current').textContent = current || (words.length?('…'+words[words.length-1].slice(-1)+' →'):'Tap letters to start');
  const wh=$('words'); wh.innerHTML='';
  words.forEach(w=>{ const s=document.createElement('span'); s.className='lb-word'; s.textContent=w; wh.appendChild(s); });
  $('progress').textContent = `${used.size} / 12 letters used · ${words.length} word${words.length===1?'':'s'}`;
}

function tap(c){
  if (current.length){
    const last=current[current.length-1];
    if (SIDE_OF[c]===SIDE_OF[last]){ toast('Next letter must be from a different side'); return; }
  } else if (words.length){
    const need=words[words.length-1].slice(-1);
    if (c!==need){ toast('Word must start with “'+need+'”'); return; }
  }
  current+=c; curSeq.push(c); render();
}
function del(){ if (!current.length) return; current=current.slice(0,-1); curSeq.pop(); render(); }
function enter(){
  if (current.length<3){ toast('Words must be at least 3 letters'); return; }
  if (!DICT.has(current)){ toast('“'+current+'” isn\'t in the football word list'); return; }
  words.push(current); current=''; curSeq=[]; save(); render(); checkWin();
}
function restart(){ words=[]; current=''; curSeq=[]; save(); render(); }
function checkWin(){
  if (usedLetters().size===12){ setTimeout(end,300); }
}
function end(){
  try { IS_TODAY && window.BKDaily && (BKDaily.record('letterboxed'), BKDaily.renderStrip(document.getElementById('dailySlate'),'letterboxed')); } catch(e){}
  openModal(`<h2>All twelve letters used!</h2>
    <p>Solved in <b>${words.length}</b> word${words.length===1?'':'s'}: ${words.join(' → ')}.</p>
    <p>${words.length<=2?'A perfect two-word start. ':''}A fresh Starting XI lands tomorrow.</p>
    <div class="share-row"><button class="btn btn-primary" id="shareNow">Share result</button></div>`);
  $('shareNow').addEventListener('click', share);
}
function share(){
  const txt=`Starting XI ⚽ solved in ${words.length} words · ${new Date().toLocaleDateString('en-GB')}\nballknw.com/letterboxed`;
  if (navigator.share) navigator.share({text:txt}).catch(()=>{});
  else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast('Copied to clipboard'));
  else toast(txt);
}
function openModal(html){ const host=$('modalHost'),card=$('modalCard'); card.innerHTML='<button class="modal-close" id="mClose">×</button>'+html; host.classList.remove('hidden'); $('mClose').addEventListener('click',()=>host.classList.add('hidden')); host.addEventListener('click',e=>{if(e.target===host)host.classList.add('hidden');}); }
function toast(msg){ const h=$('toastHost'); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; h.appendChild(t); requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},1800); }
function howModal(){ openModal(`<h2>How to play Starting XI</h2><p>Spell football words around the square and use all twelve letters.</p><ul><li>Consecutive letters must come from different sides.</li><li>Each word starts with the last letter of the one before.</li><li>Use every letter in as few words as possible.</li></ul>`); }
function solveModal(){ openModal(`<h2>One solution</h2><p>Today's square can be solved with:</p><p style="font-family:var(--serif);font-size:1.3rem;font-weight:700;color:var(--claret)">${PUZZLE.sol.join(' → ')}</p><p>There are other valid football words too — try beating it in fewer letters.</p>`); }

function init(){
  if(!IS_TODAY){ try{ var b=document.createElement('div'); b.className='replay-banner'; b.innerHTML='Replaying a past puzzle · <a href="./">play today →</a> · <a href="/archive/">archive</a>'; var h=document.querySelector('.puzzle-head'); if(h) h.appendChild(b); }catch(e){} }
  load();
  $('puzzleSub').textContent = `Use all twelve letters in as few words as you can · #${DAY}`;
  $('delBtn').addEventListener('click', del);
  $('enterBtn').addEventListener('click', enter);
  $('restartBtn').addEventListener('click', restart);
  $('howBtn').addEventListener('click', howModal);
  $('solveBtn').addEventListener('click', solveModal);
  document.addEventListener('keydown', (e)=>{
    if (!$('modalHost').classList.contains('hidden')) return;
    if (e.key==='Enter') enter();
    else if (e.key==='Backspace') del();
    else { const c=e.key.toUpperCase(); if (/^[A-Z]$/.test(c) && ALL_LETTERS.includes(c)) tap(c); }
  });
  render();
  if (usedLetters().size===12) setTimeout(end,400);
}
document.addEventListener('DOMContentLoaded', init);
