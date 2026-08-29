import { chromium } from 'playwright';
const dir='/tmp/claude-0/-home-user-New/c47b453a-ac8c-5a8c-8086-dfced9a9bf53/scratchpad/';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
const click = async n => { await p.getByRole('button',{name:n,exact:false}).first().click({timeout:9000}); await p.waitForTimeout(800); };
await click('Start new career'); await p.fill('input[placeholder="Enter a name"]','Tester');
await click('Start Career'); await click('Play Normally'); await click('Netherlands'); await click('Ajax'); await click('Take the job');
await p.waitForTimeout(1800); await p.keyboard.press('Escape'); await p.waitForTimeout(700);
await p.locator('.fm-rail__item',{hasText:/^Training/}).first().click(); await p.waitForTimeout(1000);
await p.locator('.fm-runsession').first().click(); await p.waitForTimeout(1400);
await p.screenshot({path:dir+'mini.png'});
console.log('kbd hint display:', await p.evaluate(()=>{const k=document.querySelector('.fm-kbd'); return k? getComputedStyle(k).display : 'none-el';}));
console.log('kbd text:', await p.evaluate(()=>document.querySelector('.fm-kbd')?.textContent));
// blur any focused button so Space reaches the document handler, not a click
await p.evaluate(()=>document.activeElement instanceof HTMLElement && document.activeElement.blur());
const before = await p.$$eval('.fm-mini__pip', els=>els.filter(e=>e.className.includes('good')||e.className.includes('bad')).length);
await p.keyboard.press('Space'); await p.waitForTimeout(800);
const after = await p.$$eval('.fm-mini__pip', els=>els.filter(e=>e.className.includes('good')||e.className.includes('bad')).length);
// control: does clicking the button register?
console.log('buttons in modal:', await p.$$eval('.fm-modal-backdrop button', bs=>bs.map(b=>b.className+' :: '+b.innerText.trim().replace(/\n/g,'|'))));
await p.$$eval('.fm-modal-backdrop button', bs=>{const t=bs.find(b=>/Pass|Shoot|Stop/i.test(b.innerText)); t && t.click();}); await p.waitForTimeout(800);
const afterClick = await p.$$eval('.fm-mini__pip', els=>els.filter(e=>e.className.includes('good')||e.className.includes('bad')).length);
console.log('after CLICK:', afterClick);
await p.evaluate(()=>document.activeElement instanceof HTMLElement && document.activeElement.blur());
await p.keyboard.press('Space'); await p.waitForTimeout(800);
console.log('after Space #2:', await p.$$eval('.fm-mini__pip', els=>els.filter(e=>e.className.includes('good')||e.className.includes('bad')).length));
console.log('attempts before/after Space:', before, after);
await b.close();
