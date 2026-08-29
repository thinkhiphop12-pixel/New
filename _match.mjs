import { chromium } from 'playwright';
const dir='/tmp/claude-0/-home-user-New/c47b453a-ac8c-5a8c-8086-dfced9a9bf53/scratchpad/';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
const click = async n => { await p.getByRole('button',{name:n,exact:false}).first().click({timeout:9000}); await p.waitForTimeout(800); };
await click('Start new career'); await p.fill('input[placeholder="Enter a name"]','Tester');
await click('Start Career'); await click('Play Normally'); await click('Netherlands'); await click('Ajax'); await click('Take the job');
await p.waitForTimeout(1800); await p.keyboard.press('Escape'); await p.waitForTimeout(800);
for (let i=0;i<30;i++){
  if (await p.$('.fm-teamsheet')) { console.log('gate reached at step', i); break; }
  // clear any overlay
  if (await p.$('.fm-daysummary') && i>2) {
    await p.screenshot({path:dir+'m-daysummary.png'});
    console.log('digest rows:', (await p.$$('.fm-card__list-item')).length,
      '| continue visible:', await p.evaluate(()=>{const b=document.querySelector('.fm-daysummary__actions'); if(!b) return null; const r=b.getBoundingClientRect(); return r.bottom<=window.innerHeight+1 && r.top>=0;}));
    break;
  }
  const md = await p.$('.fm-daysummary__match');
  if (md) { await md.click(); await p.waitForTimeout(1500); continue; }
  if (await p.$('.fm-daysummary')) {
    const cont = await p.$('.fm-daysummary__actions button');
    if (cont) { await cont.click(); await p.waitForTimeout(600); continue; }
  }
  const cta = await p.$('.fm-actiondock__cta');
  if (cta) { await cta.click({timeout:4000}).catch(()=>{}); await p.waitForTimeout(1100); }
  else { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
}
await p.waitForTimeout(800);
await p.screenshot({path:dir+'m-gate.png'});
console.log('teamsheet:', !!(await p.$('.fm-teamsheet')), '| modal:', !!(await p.$('.fm-matchx-modal')));
await b.close();
