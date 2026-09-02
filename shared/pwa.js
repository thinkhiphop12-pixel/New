/* Progressive web app wiring: registers the service worker and offers an
 * install prompt.
 *
 * Why this matters for this site specifically: the whole pitch is "no download".
 * Installing is the one thing a native app has that a browser game normally does
 * not, and a PWA closes that gap without an app store, a review queue, or a
 * 30% cut. It also makes the Add to Home Screen claim on the iPhone guide true —
 * that page said tapping the icon gives a full-screen view with no Safari
 * chrome, which needs a manifest with display:standalone and, on iOS, the
 * apple-mobile-web-app meta tags. Neither existed until now.
 *
 * The install button is opt-in and quiet: browsers already show their own
 * install affordance, and a second nag on top of it is how sites teach people
 * to dismiss things without reading.
 */

var PWA = {
  /* Registering the worker is safe and independent of the button. */
  serviceWorker: true,
  /* The button waits for beforeinstallprompt, which fires only when the browser
     has decided the site is installable — so it cannot appear somewhere it
     would not work. Chromium only; Safari has no equivalent event and uses the
     Share sheet instead. */
  installButton: true,
  /* Do not ask on the first visit. Someone who has never played has no reason
     to want it on their home screen. */
  minPageviews: 2,
  snoozeDays: 30,
};

var K_VIEWS = 'bk_pwa_views';
var K_SNOOZE = 'bk_pwa_snooze';

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function pwaTrack(event, props) {
  try { if (window.posthog) window.posthog.capture(event, props || {}); } catch (e) {}
}

/* ── SERVICE WORKER ── */

function registerSW() {
  if (!PWA.serviceWorker) return;
  if (!('serviceWorker' in navigator)) return;
  /* Service workers require a secure context. localhost counts, so this does
     not get in the way of local preview. */
  if (!window.isSecureContext) return;

  function go() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {
      /* A failed registration is not worth surfacing: the site works exactly as
         it did before, just without offline support. */
    });
  }

  /* Registering after `load` keeps the worker off the critical path — but this
     file is injected after hydration inside the game, by which point `load` has
     already fired and a plain listener would never run. consent.js carries the
     same guard for the same reason. */
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go);
}

/** Tear the worker down and clear its caches. Exposed for a bad release. */
function unregister() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(false);
  return navigator.serviceWorker.getRegistration().then(function (reg) {
    if (!reg) return false;
    if (reg.active) reg.active.postMessage({ type: 'UNREGISTER' });
    return reg.unregister();
  });
}

/* ── INSTALL PROMPT ── */

var deferredPrompt = null;

function alreadyInstalled() {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  } catch (e) {
    return false;
  }
}

function ensureStyles() {
  if (document.getElementById('bkPwaStyles')) return;
  var s = document.createElement('style');
  s.id = 'bkPwaStyles';
  s.textContent = [
    '#bkPwaBar{position:fixed;left:16px;right:16px;bottom:16px;z-index:9996;max-width:420px;margin:0 auto;',
    'background:#0d1711;color:#edeae0;border:1px solid rgba(255,255,255,.14);border-radius:14px;',
    'padding:14px 16px;display:flex;gap:12px;align-items:center;',
    'font-family:Inter,system-ui,-apple-system,sans-serif;box-shadow:0 16px 48px rgba(0,0,0,.45);}',
    '#bkPwaBar[hidden]{display:none;}',
    '#bkPwaBar img{width:38px;height:38px;border-radius:9px;flex:0 0 auto;}',
    '#bkPwaBar .bk-pwa-text{flex:1 1 auto;min-width:0;}',
    '#bkPwaBar strong{display:block;font-size:.9rem;font-weight:800;}',
    '#bkPwaBar span{display:block;font-size:.76rem;color:#7a9082;line-height:1.35;}',
    '#bkPwaBar button{font:inherit;font-weight:700;font-size:.8rem;border-radius:9px;padding:9px 13px;',
    'cursor:pointer;border:1px solid transparent;min-height:40px;flex:0 0 auto;}',
    '#bkPwaBar .bk-pwa-yes{background:linear-gradient(135deg,#2cb94e,#12b380);color:#052411;}',
    '#bkPwaBar .bk-pwa-no{background:none;border:none;color:#7a9082;padding:9px 6px;min-height:40px;}',
    '@media (max-width:420px){#bkPwaBar{gap:9px;padding:12px}#bkPwaBar img{width:32px;height:32px}}',
  ].join('');
  document.head.appendChild(s);
}

function hideBar(snooze) {
  var bar = document.getElementById('bkPwaBar');
  if (bar) bar.hidden = true;
  if (snooze) lsSet(K_SNOOZE, String(Date.now() + PWA.snoozeDays * 864e5));
}

function showBar() {
  ensureStyles();
  var bar = document.getElementById('bkPwaBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'bkPwaBar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Install Gaffa');
    bar.innerHTML =
      '<img src="/assets/icon-192.png" alt="" width="38" height="38">' +
      '<div class="bk-pwa-text"><strong>Add Gaffa to your home screen</strong>' +
      '<span>Opens like an app, plays offline, still nothing to download.</span></div>' +
      '<button type="button" class="bk-pwa-yes" id="bkPwaYes">Add</button>' +
      '<button type="button" class="bk-pwa-no" id="bkPwaNo" aria-label="Not now">Not now</button>';
    document.body.appendChild(bar);
    bar.querySelector('#bkPwaNo').addEventListener('click', function () {
      pwaTrack('pwa_install_dismissed');
      hideBar(true);
    });
    bar.querySelector('#bkPwaYes').addEventListener('click', function () {
      if (!deferredPrompt) return hideBar(true);
      var prompt = deferredPrompt;
      /* The event can only be used once, so drop the reference before awaiting
         the choice — a double click would otherwise throw. */
      deferredPrompt = null;
      prompt.prompt();
      prompt.userChoice
        .then(function (choice) {
          pwaTrack('pwa_install_choice', { outcome: choice && choice.outcome });
        })
        .catch(function () {})
        .then(function () {
          /* Snooze either way: accepted means it is installed, declined means
             they have answered. Re-asking on the next pageview is how a prompt
             becomes something people dismiss reflexively. */
          hideBar(true);
        });
    });
  }
  bar.hidden = false;
  pwaTrack('pwa_install_offered');
}

function initInstallPrompt() {
  if (!PWA.installButton) return;
  if (alreadyInstalled()) return;

  window.addEventListener('beforeinstallprompt', function (e) {
    /* Take control of when this is shown. Left alone, Chromium picks its own
       moment, which is often the worst one — mid-match, on a first visit. */
    e.preventDefault();
    deferredPrompt = e;

    var snooze = parseInt(lsGet(K_SNOOZE) || '0', 10);
    if (snooze && Date.now() < snooze) return;

    var views = parseInt(lsGet(K_VIEWS) || '0', 10) + 1;
    lsSet(K_VIEWS, String(views));
    if (views < PWA.minPageviews) return;

    /* Never stack on the cookie banner or the prize-draw modal. */
    var banner = document.getElementById('consentBanner');
    if (banner && !banner.classList.contains('hidden')) return;
    var comp = document.getElementById('bkCompOverlay');
    if (comp && !comp.hidden) return;

    showBar();
  });

  window.addEventListener('appinstalled', function () {
    pwaTrack('pwa_installed');
    hideBar(false);
  });
}

window.BKPwa = {
  unregister: unregister,
  isInstalled: alreadyInstalled,
  config: PWA,
};

registerSW();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInstallPrompt);
} else {
  initInstallPrompt();
}
