import { chromium } from 'playwright';
const dir='/tmp/claude-0/-home-user-New/c47b453a-ac8c-5a8c-8086-dfced9a9bf53/scratchpad/';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
const click = async n => { await p.getByRole('button',{name:n,exact:false}).first().click({timeout:9000}); await p.waitForTimeout(900); };
await click('Start new career'); await p.fill('input[placeholder="Enter a name"]','Tester');
await click('Start Career'); await click('Play Normally'); await click('Netherlands'); await click('Ajax'); await click('Take the job');
await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
await p.locator('.fm-rail__item',{hasText:/^Market/}).first().click(); await p.waitForTimeout(1000);
await p.screenshot({path:dir+'tr-1.png'});
// scroll the panel to see the list
await p.evaluate(()=>document.querySelector('.fm-hub-panel').scrollTop = 520); await p.waitForTimeout(500);
await p.screenshot({path:dir+'tr-2.png'});
for (const t of ['Scouting','Jobs']) {
  try { await p.locator('.fm-subtab',{hasText:new RegExp('^'+t+'$')}).first().click(); await p.waitForTimeout(1000);
    await p.screenshot({path:dir+'tr-'+t.toLowerCase()+'.png'}); } catch(e){ console.log('miss',t); }
}
await b.close();
