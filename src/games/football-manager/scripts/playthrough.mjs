#!/usr/bin/env node
/* Drives the built game in a real browser and reports on the daily loop.
 *
 * Two jobs:
 *   1. Baseline the loop — how many days pass per CONTINUE, how often the sim
 *      stops, and what it stops for. Re-run after any change to the loop and
 *      diff the numbers rather than asserting an improvement.
 *   2. Regression-check that a hidden tab does not advance game state. A
 *      backgrounded tab throttles setTimeout/setInterval but does not stop
 *      them, so this is a real failure mode, not a theoretical one.
 *
 * STATUS: setup and the control are working — it reaches the hub, pages through
 * onboarding, and reads the WK/countdown clock. The hidden-tab assertion is NOT
 * yet trustworthy and currently reports INCONCLUSIVE: after a day is simulated
 * the app moves to the Day Summary, and getting reliably back to a hub reading
 * before measuring is unsolved. Do not treat a PASS from this script as
 * evidence until that is fixed.
 *
 * Two false passes have already come out of this file, which is why the control
 * exists: an early version matched the hair option "1 Bald" as a date and
 * "passed" from the character creator, and a later one passed with the fix
 * reverted because it hid the tab after the run had already stopped. The
 * control refuses to report a result unless the clock demonstrably moved while
 * visible first.
 *
 * Requires the static export to be built and served:
 *   npm -w src/games/football-manager run export:static
 *   node scripts/preview-server.mjs
 *
 * Usage: node src/games/football-manager/scripts/playthrough.mjs [--days 30]
 */
import { chromium } from 'playwright';

const BASE = process.env.GAFFA_URL || 'http://127.0.0.1:3000/gaffa/';
const argDays = Number((process.argv.find((a) => a.startsWith('--days=')) || '').split('=')[1]) || 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Click a button by its exact visible label, scanning every button on the
 *  page rather than the first handful — the setup screens have 30+. */
async function clickExact(page, label, timeout = 5000) {
  const btn = page.locator('button', { hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') }).first();
  if (!(await btn.count())) return false;
  await btn.click({ timeout }).catch(() => {});
  await sleep(900);
  return true;
}

/** First run opens a "How to play" tour in a .fm-modal-backdrop that covers
 *  the hub, including the sim button — Playwright clicks on anything beneath
 *  it simply time out. Page through it until the backdrop is gone. */
async function dismissModals(page, max = 14) {
  for (let i = 0; i < max; i++) {
    const open = await page.evaluate(() => !!document.querySelector('.fm-modal-backdrop'));
    if (!open) return i;
    let clicked = false;
    for (const label of ['Next', 'Finish', 'Got it', 'Start', 'Close', 'Done']) {
      const btn = page
        .locator('.fm-modal-backdrop button', { hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') })
        .first();
      if (await btn.count()) {
        await btn.click({ timeout: 3000 }).catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await sleep(500);
  }
  return max;
}

async function labels(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean),
  );
}

/** The hub's clock, used for every measurement below. The header shows a week
 *  counter ("WK 1/48") and a day countdown to the next fixture ("In 5 days");
 *  together they move whenever game time moves. Returns null off the hub.
 *
 *  An earlier version looked for a "<day> <Month>" date, which the hub never
 *  renders — and its loose regex matched the hair option "1 Bald", so the
 *  hidden-tab check reported a pass from the character creator. */
async function gameClock(page) {
  return page.evaluate(() => {
    const t = document.body.innerText || '';
    const wk = t.match(/WK\s*(\d+)\s*\/\s*(\d+)/);
    if (!wk) return null;
    const days = t.match(/In\s+(\d+)\s+days?/);
    return `WK ${wk[1]}/${wk[2]}${days ? ` | next match in ${days[1]}d` : ''}`;
  });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(7000);

  // --- setup: get from the main menu to the hub -------------------------
  const steps = [];
  await clickExact(page, 'Accept all');
  await clickExact(page, 'Start new career');

  // The character creator refuses to advance without a manager name, and says
  // so inline rather than disabling the button — so fill it before clicking.
  // The field carries no `type` attribute, so `input[type="text"]` misses it.
  const nameField = page.locator('input[placeholder="Enter a name"], input').first();
  if (await nameField.count()) {
    await nameField.fill('Sam Okonkwo').catch(() => {});
    steps.push('named manager');
    await sleep(400);
  }

  // Setup is a fixed sequence: Manager -> Scenario -> Nation -> Club. A generic
  // "click the first card, then the first action" loop looked tidier but was
  // unreliable — a nation navigates on click with no confirm button, while the
  // club screen needs a selection *before* its confirm does anything. Walking
  // the real path explicitly is shorter and honest about the flow.
  await clickExact(page, 'Start Career');
  steps.push('Start Career');
  await clickExact(page, 'Play Normally');
  steps.push('Play Normally');

  const nation = page.locator('button', { hasText: 'England' }).first();
  if (await nation.count()) {
    await nation.click({ timeout: 5000 }).catch(() => {});
    steps.push('nation: England');
    await sleep(1400);
  }

  // Club rows are the only buttons carrying a star rating; the division names
  // above them are filters, and selecting one confirms nothing.
  const club = page.locator('button', { hasText: /★/ }).first();
  if (await club.count()) {
    const name = (await club.innerText()).trim().split('\n')[0].slice(0, 26);
    await club.click({ timeout: 5000 }).catch(() => {});
    steps.push(`club: ${name}`);
    await sleep(1200);
  }

  await clickExact(page, 'Take the job');
  steps.push('Take the job');
  await sleep(2500);

  const paged = await dismissModals(page);
  if (paged) steps.push(`dismissed onboarding (${paged} panels)`);

  const atHub = await gameClock(page);
  console.log('setup path:', steps.join(' -> ') || '(none)');
  console.log('in-game clock at hub:', atHub ?? 'NOT REACHED');

  if (!atHub) {
    console.log('\nCould not reach the hub; dumping buttons for the next iteration:');
    console.log((await labels(page)).slice(0, 40));
    console.log('\npageerrors:', errors.length ? errors : 'none');
    await browser.close();
    process.exitCode = 1;
    return;
  }

  // --- hidden-tab regression check --------------------------------------
  // Start a run, background the tab, and confirm the date stops moving.
  // The dock's primary sim button is labelled by what it will run to.
  for (const label of ['Next event', 'Continue', 'Continue to matchday']) {
    if (await clickExact(page, label)) break;
  }

  // Control first: the clock must actually move while the tab is visible,
  // otherwise "it didn't move while hidden" proves nothing. A run that never
  // started would otherwise report a pass — which an earlier version of this
  // script did, from the character creator.
  await sleep(4000);
  // A day that stops lands on the Day Summary, which has no WK clock — go back
  // to the hub before reading it, or every measurement comes back null.
  await dismissModals(page);
  // The dock's Home button renders its attention badge inside the button, so
  // its innerText is "Home\n2\nneeding attention" — an exact-match regex misses
  // it. Match on the prefix instead.
  await page.locator('button', { hasText: /^Home\b/ }).first().click({ timeout: 4000 }).catch(() => {});
  await sleep(1200);
  const whileVisible = await gameClock(page);

  // Now the real test: go hidden BEFORE starting a run. Without the guard the
  // loop's first tickOneDay() runs synchronously before its first await, so a
  // hidden tab still burns a day; with it, the loop breaks before ticking. That
  // difference is what makes this able to fail.
  //
  // Hiding *after* a run has already stopped proves nothing — an earlier
  // version did that and passed with the fix reverted.
  const beforeHide = await gameClock(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(300);
  for (const label of ['Next event', 'Continue', 'Continue to matchday']) {
    if (await clickExact(page, label)) break;
  }
  await sleep(4000);
  const afterHide = await gameClock(page);

  console.log('\n--- daily loop ---');
  console.log(`clock at hub      : ${atHub}`);
  console.log(`after 4s visible  : ${whileVisible}`);

  // The control compares two real hub readings. Simming can leave the hub for
  // the day summary, where the clock reads null — treating that as "it moved"
  // would let a broken run masquerade as a working one.
  const controlMoved = Boolean(atHub && beforeHide && beforeHide !== atHub);
  console.log(`clock before hiding: ${beforeHide}`);
  console.log(
    controlMoved
      ? `control OK — clock advanced ${atHub} -> ${beforeHide} while visible`
      : 'CONTROL FAILED — clock did not advance while visible, so the hidden-tab result proves nothing',
  );

  console.log('\n--- hidden-tab check ---');
  console.log(`clock before hiding : ${beforeHide}`);
  console.log(`after sim while hidden: ${afterHide}`);
  if (!controlMoved) console.log('INCONCLUSIVE');
  else console.log(afterHide === beforeHide ? 'PASS — hidden tab did not advance the clock' : 'FAIL — clock advanced while the tab was hidden');

  console.log('\npageerrors:', errors.length ? errors : 'none');
  await browser.close();
  if (!controlMoved || afterHide !== beforeHide) process.exitCode = 1;
}

main();
