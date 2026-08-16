import { chromium } from 'playwright';
const dir = process.argv[2];
const W = Number(process.argv[3] ?? 956), H = Number(process.argv[4] ?? 440);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const shot = (n) => p.screenshot({ path: `${dir}/${n}.png` });
const tap = async (sel) => {
  const el = await p.$(sel);
  if (!el) { console.log('MISS', sel); return false; }
  await el.click();
  await p.waitForTimeout(900);
  return true;
};
await p.goto('http://localhost:3000/gaffa/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
await tap('button:has-text("Accept all")');
await tap('button:has-text("Start new career")');
const nameInput = await p.$('input[placeholder="Enter a name"]');
if (nameInput) { await nameInput.fill('Test Gaffer'); await p.waitForTimeout(200); }
await tap('button:has-text("Start Career")');
console.log('after start:', (await p.$$eval('button', (bs) => bs.map((x) => x.innerText.trim()).filter(Boolean))).slice(0, 12));
await shot('01-flow');
// scenario / nation / club pickers: take the first offered option each time
for (let i = 0; i < 8; i++) {
  const btns = await p.$$eval('button', (bs) => bs.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  console.log('step', i, btns.slice(0, 10));
  await shot(`step-${i}`);
  if (btns.some((t) => /Play Normally/i.test(t))) { await tap('button:has-text("Play Normally")'); continue; }
  if (btns.some((t) => /England/i.test(t))) { await tap('button:has-text("England")'); continue; }
  if (btns.some((t) => /Arsenal/i.test(t))) {
    await tap('button:has-text("Arsenal")');
    const after = await p.$$eval('button', (bs) => bs.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
    console.log('CONFIRM?', after.slice(0, 8));
    await tap('button:has-text("Take the job")');
    continue;
  }
  break;
}
// In the hub now: capture the intro, the tour, and a few screens.
await p.waitForTimeout(1200);
await shot('10-intro');
await tap('button:has-text("show me how")');
await shot('11-tour');
await p.keyboard.press('Escape');
await p.waitForTimeout(800);
await shot('12-hub');
for (const [nav, sub, name] of [['Training', 'Fitness', '13-fitness'], ['Training', 'Team', '14-training'], ['Squad', 'Players', '15-squad'], ['Market', 'Transfers', '16-transfers']]) {
  await tap(`button[title="${nav}"]`);
  await tap(`button:has-text("${sub}")`);
  await shot(name);
}
await b.close();
