import { chromium } from 'playwright';
const dir='/tmp/claude-0/-home-user-New/c47b453a-ac8c-5a8c-8086-dfced9a9bf53/scratchpad/';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
const click = async n => { await p.getByRole('button',{name:n,exact:false}).first().click({timeout:8000}); await p.waitForTimeout(800); };
await click('Start new career'); await p.fill('input[placeholder="Enter a name"]','Tester');
await click('Start Career'); await click('Play Normally'); await click('Netherlands'); await click('Ajax'); await click('Take the job');
await p.waitForTimeout(2200);
await p.screenshot({path:dir+'a-intro.png'});
await p.keyboard.press('Escape'); await p.waitForTimeout(700);
await p.locator('.fm-rail__item',{hasText:/^Club/}).first().click(); await p.waitForTimeout(700);
try { await p.locator('.fm-subtab',{hasText:/^Staff$/}).first().click(); await p.waitForTimeout(800); } catch {}
await p.screenshot({path:dir+'a-staff.png'});
await b.close();
