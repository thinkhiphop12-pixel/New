import { chromium } from 'playwright';
const dir='/tmp/claude-0/-home-user-New/c47b453a-ac8c-5a8c-8086-dfced9a9bf53/scratchpad/';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:390,height:844} });
await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
const click = async n => { await p.getByRole('button',{name:n,exact:false}).first().click({timeout:9000}); await p.waitForTimeout(800); };
await click('Start new career'); await p.fill('input[placeholder="Enter a name"]','Tester');
await click('Start Career'); await click('Play Normally'); await click('Netherlands'); await click('Ajax'); await click('Take the job');
await p.waitForTimeout(1800); await p.keyboard.press('Escape'); await p.waitForTimeout(700);
const probe = async () => p.evaluate(() => {
  const vw = document.documentElement.clientWidth; const out=[];
  for (const el of document.querySelectorAll('.fm-hub-panel *')) {
    const b = el.getBoundingClientRect(); if (!b.width) continue;
    if (b.right > vw+1 && getComputedStyle(el.parentElement).overflowX === 'visible')
      out.push(el.className.toString().slice(0,40)+' r='+Math.round(b.right));
  }
  return [...new Set(out)].slice(0,4);
});
await p.locator('.fm-rail__item',{hasText:/^Squad/}).first().click(); await p.waitForTimeout(700);
await p.locator('.fm-subtab',{hasText:/^Tactics$/}).first().click(); await p.waitForTimeout(1000);
console.log('TACTICS overflow:', JSON.stringify(await probe()));
const cf = await p.$('.fm-custom-formation'); if (cf) { await cf.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await p.screenshot({path:dir+'ph-cf.png'}); }
await p.locator('.fm-rail__item',{hasText:/^Market/}).first().click(); await p.waitForTimeout(1100);
console.log('TRANSFERS overflow:', JSON.stringify(await probe()));
const ra = await p.$('.fm-rowactions'); if (ra) { await ra.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await p.screenshot({path:dir+'ph-ra.png'}); }
await b.close();
