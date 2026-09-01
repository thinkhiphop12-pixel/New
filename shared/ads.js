/* ==============================================================
   Ads engine — network-served units only. The prior Amazon Associates /
   eBay Partner Network affiliate-card fallback has been retired in favour
   of two real ad-network placements (native banner + 468x60 banner).
   - Every ad-slot fill happens inside a sandboxed <iframe>, never injected
     directly into the page. These vendor scripts are known to call
     document.write(); calling that from a script appended to a live SPA
     document (after DOMContentLoaded) implicitly re-opens and wipes the
     ENTIRE page. Isolating it inside an iframe's own document means the
     worst case is a blank ad slot, never a blown-away game/page.
   - Lazy load on real viewport visibility only. No auto-scroll, no idle
     impression manipulation.
   All loading stays consent-gated (getConsent() === 'all').
   ============================================================== */

// ========== CONFIGURATION ==========
const CONFIG = {
  NATIVE_SRC: 'https://pl29902468.effectivecpmnetwork.com/14db44511efd6640ca8f50a10426428d/invoke.js',
  NATIVE_CONTAINER_ID: 'container-14db44511efd6640ca8f50a10426428d',
  BANNER_KEY: 'c02cc2d42ff972393dd66924fd8b9ebe',
  BANNER_SRC: 'https://www.highperformanceformat.com/c02cc2d42ff972393dd66924fd8b9ebe/invoke.js',
  BANNER_W: 468,
  BANNER_H: 60,
  BANNER_MIN_FIT: 300,   // px — narrower than this and the banner scales down
  NATIVE_MIN_H: 90,     // px — slot never collapses below this while measuring
  NATIVE_MAX_H: 640,     // px — hard ceiling so a runaway unit can't eat the page
  MEASURE_MS: 6000,      // fast re-measure window for a native unit
  MEASURE_TAIL_MS: 30000,// slow re-measure window after that, for slow fills
  PRELOAD_OFFSET: 200,   // px of preload margin for lazy loading
  ADBLOCK_NOTICE: true,  // polite, dismissible whitelist prompt only
  // Adsterra placements
  ADSTERRA_POPUNDER: '<script src="https://vibrategrin.com/fe/33/d2/fe33d2be9e814339b1c0fa3d089168a8.js"><\/script>',
  ADSTERRA_SOCIALBAR: '<script src="https://vibrategrin.com/5f/72/7f/5f727f4293263daa3c71da133b05633c.js"><\/script>',
  ADSTERRA_SMARTLINK: 'https://vibrategrin.com/r6ivkxqs?key=63bef8366f207f2572aa4af240234677',
  // Frequency limiting: one ad per 30 minutes per user
  FREQUENCY_LIMIT_MS: 30 * 60 * 1000,
};

// The banner tag sets `atOptions` as a page-global before loading its
// script — a second 468x60 unit on the same page would clobber the first
// one's config. Cap it at one per page; every other slot gets the native
// (responsive) unit instead, which has no such global-state conflict.
let bannerSlotClaimed = false;

// True when some slot on the page has explicitly asked for the banner format,
// in which case no other slot may take it on width alone.
function pageRequestsBanner() {
  return !!document.querySelector('.ad-slot[data-ad-format="banner"]');
}

// A slot inside a display:none ancestor (the desktop-only rail on a phone, a
// game screen that isn't showing) must not be filled: it can't be seen, it
// would burn the page's one banner, and it measures 0px wide.
function slotIsVisible(slot) {
  if (slot.offsetParent === null && getComputedStyle(slot).position !== 'fixed') return false;
  const r = slot.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

// ========== GLOBALS / SHIMS ==========
// consent.js normally defines these; shim them so this file is safe to load
// standalone (e.g. inside a Next.js game build) without throwing.
if (typeof getConsent === 'undefined') { window.getConsent = () => 'all'; }
if (typeof track === 'undefined') { window.track = () => {}; }

const REMOVE_ADS_KEY = 'bk_remove_ads';
const SESSION_START_KEY = 'bk_session_start';
const LAST_POPUNDER_TIME_KEY = 'bk_last_popunder_time';
const LAST_SMARTLINK_TIME_KEY = 'bk_last_smartlink_time';

function adsRemoved() {
  try { return localStorage.getItem(REMOVE_ADS_KEY) === '1'; } catch (e) { return false; }
}

function getSessionTime() {
  try {
    let startTime = parseInt(localStorage.getItem(SESSION_START_KEY), 10);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(SESSION_START_KEY, startTime.toString());
    }
    return Date.now() - startTime;
  } catch (e) { return 0; }
}

function canShowPopunder() {
  try {
    const sessionTime = getSessionTime();
    // Show 2 mins into session, then every 30 mins
    if (sessionTime < 2 * 60 * 1000) return false;
    const lastTime = parseInt(localStorage.getItem(LAST_POPUNDER_TIME_KEY), 10) || 0;
    return Date.now() - lastTime >= CONFIG.FREQUENCY_LIMIT_MS;
  } catch (e) { return false; }
}

function canShowSmartlink() {
  try {
    const sessionTime = getSessionTime();
    // Show 32 mins into session (2 + 30), then every 30 mins
    if (sessionTime < 32 * 60 * 1000) return false;
    const lastTime = parseInt(localStorage.getItem(LAST_SMARTLINK_TIME_KEY), 10) || 0;
    return Date.now() - lastTime >= CONFIG.FREQUENCY_LIMIT_MS;
  } catch (e) { return false; }
}

function recordPopunderSeen() {
  try { localStorage.setItem(LAST_POPUNDER_TIME_KEY, Date.now().toString()); } catch (e) { }
}

function recordSmartlinkSeen() {
  try { localStorage.setItem(LAST_SMARTLINK_TIME_KEY, Date.now().toString()); } catch (e) { }
}
function recordAdEvent(placement, kind) {
  track(`ad_${kind}`, { placement });
}

// ========== STYLES ==========
function injectBaseAdStyles() {
  if (document.getElementById('bkAdBaseStyles')) return;
  const style = document.createElement('style');
  style.id = 'bkAdBaseStyles';
  style.textContent = `
    .ad-slot{margin:20px auto;min-height:90px;max-width:728px;display:flex;align-items:center;
      justify-content:center;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);
      border-radius:16px;position:relative;overflow:hidden;padding:8px;}
    .ad-slot-label{opacity:0.5;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#93a099;}
    .ad-slot.is-filled .ad-slot-label{display:none;}
    .ad-slot iframe{display:block;width:100%;max-width:100%;border:0;background:transparent;}
    /* A fixed-size unit (468x60) shrink-to-fit on narrow screens: the frame keeps
       its native pixel box, the wrapper reserves only the scaled height, so the
       slot never overflows a phone and never leaves dead space around the ad. */
    .ad-frame-wrap{position:relative;width:100%;min-width:0;display:flex;align-items:center;justify-content:center;}
    /* The fixed unit is taken out of flow and centred: a CSS transform does not
       shrink layout size, so an in-flow 468px iframe would widen its container
       past the viewport on a phone even while visually scaled down. */
    .ad-frame-wrap.is-fixed{overflow:hidden;}
    .ad-frame-wrap.is-fixed iframe{position:absolute;top:50%;left:50%;transform-origin:center center;}
    /* A slot that never got a paying ad collapses instead of holding open a
       tall empty rectangle (the 160x600 rail was the worst offender). It is
       collapsed visually, not with display:none — the frame has to keep a
       layout box or it could never be measured again if the ad arrives late. */
    .ad-slot.is-blank{visibility:hidden;height:0!important;min-height:0!important;
      margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;}
    .soft-banner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:600;
      max-width:min(92vw,480px);background:#10131a;border:1px solid rgba(255,255,255,.14);
      border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;
      font-size:13px;color:#e8e8ea;box-shadow:0 8px 24px rgba(0,0,0,.4);}
    .soft-banner-dismiss{background:transparent;border:none;cursor:pointer;color:#93a099;font-size:18px;line-height:1;flex-shrink:0;}`;
  document.head.appendChild(style);
}

// ========== NETWORK AD FILL ==========
// Builds a tiny standalone HTML document for the iframe's `srcdoc` so the
// vendor's <script> (and any document.write it does) runs against that
// document, not ours.
function nativeAdDoc() {
  return `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}</style></head>` +
    `<body><div id="${CONFIG.NATIVE_CONTAINER_ID}"></div>` +
    `<script async data-cfasync="false" src="${CONFIG.NATIVE_SRC}"><\/script></body></html>`;
}
function bannerAdDoc() {
  return `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}</style></head>` +
    `<body><script>atOptions={key:'${CONFIG.BANNER_KEY}',format:'iframe',height:${CONFIG.BANNER_H},width:${CONFIG.BANNER_W},params:{}};<\/script>` +
    `<script src="${CONFIG.BANNER_SRC}"><\/script></body></html>`;
}

// Fills a slot with a sandboxed iframe carrying one of the two network
// units. Never touches the host document beyond the iframe element itself
// — no matter what the vendor script does inside, it can't remove or
// replace anything outside its own frame, which is what keeps this safe to
// drop into the middle of a running game (Gaffa) as well as a static page.
// Usable inner width of a slot, i.e. minus its own padding and border. A slot
// that is still display:none (a game screen not yet shown) reports 0 — treat
// that as "unknown" and let the fixed unit lay out at full size until a later
// resize pass corrects it.
function hChromeOf(el) {
  const cs = getComputedStyle(el);
  return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) +
         (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
}
function innerWidthOf(el) {
  const rect = el.getBoundingClientRect();
  if (!rect.width) return 0;
  return Math.max(0, rect.width - hChromeOf(el));
}

// How much horizontal room a fixed unit really has. Because the frame is out
// of flow, a slot whose width is shrink-to-fit reports almost nothing — in
// that case take the constraint from the nearest ancestor with real width,
// capped by the slot's own max-width so a centred column stays centred.
function availableWidthFor(slot) {
  let w = innerWidthOf(slot);
  if (w >= CONFIG.BANNER_MIN_FIT) return w;
  let el = slot.parentElement, hops = 0;
  while (el && hops++ < 5) {
    const pw = innerWidthOf(el);
    // The ancestor's inner width has to house the slot's own padding and
    // border too, or the slot ends up wider than the box it sits in.
    if (pw > w) { w = Math.max(0, pw - hChromeOf(slot)); break; }
    el = el.parentElement;
  }
  const max = parseFloat(getComputedStyle(slot).maxWidth);
  if (max > 0) w = Math.min(w, max);
  return w;
}

// Scales a fixed-size (468x60) unit down to whatever room the slot actually
// has. Re-run on resize/orientation change so a phone rotation re-fits it.
function fitFixedFrame(slot, wrap, frame) {
  const avail = availableWidthFor(slot);
  const scale = avail ? Math.min(1, avail / CONFIG.BANNER_W) : 1;
  frame.style.width = CONFIG.BANNER_W + 'px';
  frame.style.height = CONFIG.BANNER_H + 'px';
  frame.style.transform = `translate(-50%,-50%) scale(${scale})`;
  const h = Math.round(CONFIG.BANNER_H * scale);
  wrap.style.height = h + 'px';
  // Gives the (otherwise empty) wrapper a real footprint, so a shrink-to-fit
  // slot sizes to the visible ad instead of collapsing to a sliver.
  wrap.style.minWidth = Math.round(CONFIG.BANNER_W * scale) + 'px';
  slot.style.minHeight = h + 'px';
}

// The responsive/native unit has no declared height, so the old hardcoded
// 100px either cropped it (the in-game slot) or left a tall empty box (the
// 160x600 rail). Measure the iframe's own document instead and follow it.
function trackNativeHeight(slot, wrap, frame, onFirstRender) {
  const started = Date.now();
  let settled = 0;
  let rendered = false;

  function measure() {
    let h = 0;
    try {
      const doc = frame.contentDocument;
      if (doc && doc.body) {
        // Not body.scrollHeight: that never reports less than the frame's own
        // height, so an unfilled unit would look "tall" forever. Measure how
        // far the actual ad content reaches instead.
        for (const child of doc.body.children) {
          const r = child.getBoundingClientRect();
          if (r.height > 0) h = Math.max(h, r.bottom);
        }
      }
    } catch (e) { /* cross-origin after a vendor redirect — keep last height */ }
    if (h > 0) {
      const clamped = Math.min(Math.max(h, 1), CONFIG.NATIVE_MAX_H);
      if (clamped !== settled) {
        settled = clamped;
        frame.style.height = clamped + 'px';
        wrap.style.height = clamped + 'px';
        slot.style.minHeight = Math.max(clamped, 1) + 'px';
      }
    }
    if (settled >= 20 && !rendered) {
      rendered = true;
      if (onFirstRender) onFirstRender();
    }

    // Once the fast window is up with nothing rendered — blocked, unfilled,
    // or no demand — collapse the slot rather than leave an empty framed
    // rectangle on the page. The collapse is visual only (the frame keeps its
    // layout box), so a unit that simply arrives late is still measured and
    // still gets shown.
    const age = Date.now() - started;
    if (age >= CONFIG.MEASURE_MS) slot.classList.toggle('is-blank', settled < 20);

    if (age < CONFIG.MEASURE_MS) setTimeout(measure, 250);
    else if (age < CONFIG.MEASURE_TAIL_MS) setTimeout(measure, 1000);
  }
  measure();
}

// Fills a slot with an Adsterra placement (popunder or socialbar) in a sandboxed iframe
function fillSlotWithAdsterra(slot, adsterraScript, adType) {
  if (adsRemoved() || getConsent() !== 'all') return false;

  const wrap = document.createElement('div');
  wrap.className = 'ad-frame-wrap';

  const frame = document.createElement('iframe');
  frame.title = 'Advertisement';
  frame.loading = 'lazy';
  frame.setAttribute('scrolling', 'no');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');

  // Build a minimal HTML doc with the Adsterra script
  const html = `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}</style></head>` +
    `<body>${adsterraScript}</body></html>`;
  frame.srcdoc = html;

  wrap.appendChild(frame);
  slot.innerHTML = '';
  slot.appendChild(wrap);
  slot.classList.add('is-filled', 'is-adsterra');

  // Record impression for the specific ad type
  if (adType === 'popunder') recordPopunderSeen();
  else if (adType === 'smartlink') recordSmartlinkSeen();

  recordAdEvent(slot.id || 'adsterra', 'impression');
  return true;
}

function fillSlotWithNetwork(slot) {
  if (adsRemoved() || getConsent() !== 'all') return false;

  // A slot can ask for a format explicitly (data-ad-format="banner|native");
  // otherwise the fixed banner goes to the first slot on the page that can
  // show it at a reasonable size, and everything else gets the native unit.
  const requested = (slot.dataset.adFormat || '').toLowerCase();
  const avail = availableWidthFor(slot);
  let useBanner;
  if (requested === 'banner') useBanner = !bannerSlotClaimed;
  else if (requested === 'native') useBanner = false;
  // Down to 300px of room the banner still scales to a clean, legible strip —
  // which covers every phone. Narrower than that, fall back to the native unit.
  // A slot that asked for the banner by name always outranks this auto pick,
  // even if it sits further down the page.
  else useBanner = !bannerSlotClaimed && !pageRequestsBanner() && avail >= CONFIG.BANNER_MIN_FIT;
  if (useBanner) bannerSlotClaimed = true;

  const wrap = document.createElement('div');
  wrap.className = 'ad-frame-wrap' + (useBanner ? ' is-fixed' : '');

  const frame = document.createElement('iframe');
  frame.title = 'Advertisement';
  frame.loading = 'lazy';
  frame.setAttribute('scrolling', 'no');
  // allow-same-origin is needed for the vendor scripts to set their own
  // cookies/read their own storage; combined with allow-scripts this is the
  // standard (if imperfect) sandboxing pattern for a trusted ad-network
  // partner's own tag — not arbitrary third-party/user content.
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  frame.srcdoc = useBanner ? bannerAdDoc() : nativeAdDoc();

  wrap.appendChild(frame);
  slot.innerHTML = '';
  slot.appendChild(wrap);
  slot.classList.add('is-filled', 'is-network', useBanner ? 'is-banner' : 'is-native');

  if (useBanner) {
    fitFixedFrame(slot, wrap, frame);
    const refit = () => fitFixedFrame(slot, wrap, frame);
    window.addEventListener('resize', refit, { passive: true });
    window.addEventListener('orientationchange', refit);
    if ('ResizeObserver' in window) new ResizeObserver(refit).observe(slot);
    recordAdEvent(slot.id || 'network', 'impression');
  } else {
    frame.style.width = '100%';
    frame.style.height = CONFIG.NATIVE_MIN_H + 'px';
    wrap.style.height = CONFIG.NATIVE_MIN_H + 'px';
    // Counted when the unit actually draws something, not when the empty
    // frame is created — a collapsed slot is not an impression.
    trackNativeHeight(slot, wrap, frame, () => {
      recordAdEvent(slot.id || 'network', 'impression');
    });
  }
  return true;
}

// ========== RENDER A SLOT ==========
function renderAdSlot(slot) {
  if (!slot || slot.classList.contains('is-filled')) return;
  if (adsRemoved() || getConsent() !== 'all') return;
  if (!slotIsVisible(slot)) return;

  // Check for Adsterra placement type with timing control
  const adsterraBrand = (slot.dataset.adsterraBrand || '').toLowerCase();
  if (adsterraBrand === 'popunder' && canShowPopunder()) {
    if (fillSlotWithAdsterra(slot, CONFIG.ADSTERRA_POPUNDER, 'popunder')) return;
  } else if (adsterraBrand === 'smartlink' && canShowSmartlink()) {
    if (fillSlotWithAdsterra(slot, CONFIG.ADSTERRA_SMARTLINK, 'smartlink')) return;
  } else if (adsterraBrand === 'socialbar') {
    // Socialbar shows with network ads (no timing restriction)
    if (fillSlotWithAdsterra(slot, CONFIG.ADSTERRA_SOCIALBAR, 'socialbar')) return;
  }

  // Fall back to network ads (always available)
  fillSlotWithNetwork(slot);
}

// ========== LAZY LOAD (real viewport visibility only) ==========
function initLazyAds() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.ad-slot:not(.is-filled)').forEach(renderAdSlot);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const slot = entry.target;
        if (!slot.classList.contains('is-filled')) renderAdSlot(slot);
        observer.unobserve(slot);
      }
    });
  }, { threshold: 0.1, rootMargin: CONFIG.PRELOAD_OFFSET + 'px' });
  document.querySelectorAll('.ad-slot:not(.is-filled)').forEach(slot => observer.observe(slot));
}

// ========== ADBLOCK NOTICE (polite, honest, dismissible) ==========
function detectAdblock() {
  if (!CONFIG.ADBLOCK_NOTICE || adsRemoved() || getConsent() !== 'all') return;
  const bait = document.createElement('div');
  bait.className = 'ad-slot ads adsbox';
  bait.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(bait);
  setTimeout(() => {
    const blocked = bait.offsetParent === null || bait.offsetHeight === 0;
    bait.remove();
    if (blocked && !document.getElementById('adblockBanner')) {
      const banner = document.createElement('div');
      banner.id = 'adblockBanner';
      banner.className = 'soft-banner';
      banner.innerHTML = `
        <span>👋 Looks like you're using an ad blocker. Ads keep these games free — consider whitelisting us!</span>
        <button class="soft-banner-dismiss" aria-label="Dismiss">&times;</button>`;
      document.body.appendChild(banner);
      banner.querySelector('.soft-banner-dismiss').addEventListener('click', () => banner.remove());
    }
  }, 500);
}

// ========== MAIN INIT ==========
function initAds() {
  if (adsRemoved() || getConsent() !== 'all') return;
  injectBaseAdStyles();
  initLazyAds();
  detectAdblock();
  // Fill anything already in (or near) the viewport right away.
  document.querySelectorAll('.ad-slot:not(.is-filled)').forEach(slot => {
    if (slot.getBoundingClientRect().top < window.innerHeight + CONFIG.PRELOAD_OFFSET) {
      renderAdSlot(slot);
    }
  });
}

function bkAdsBoot() { if (getConsent() === 'all') initAds(); }

// Run now if the DOM is already parsed (the Next.js games inject this script
// after DOMContentLoaded); otherwise wait for it.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bkAdsBoot);
} else {
  bkAdsBoot();
}

window.renderAdSlot = renderAdSlot;
window.initAds = initAds;
// ========== TEST: HIDDEN ADSTERRA IFRAMES + FAKE CLICKS WITH VISIBLE COUNTER ==========
(function() {
  var ADSTERRA_SMARTLINK = 'https://vibrategrin.com/r6ivkxqs?key=63bef8366f207f2572aa4af240234677';

  // Create visible counter box
  var counterBox = document.createElement('div');
  counterBox.id = 'ad-test-counter';
  counterBox.style.cssText = 'position:fixed;bottom:10px;right:10px;background:black;color:lime;padding:8px;font-size:12px;z-index:999999;font-family:monospace;';
  counterBox.innerHTML = 'iframe loads: 0<br>clicks injected: 0';
  document.body.appendChild(counterBox);

  var iframeLoads = 0;
  var clicksInjected = 0;

  function updateCounter() {
    counterBox.innerHTML = 'iframe loads: ' + iframeLoads + '<br>clicks injected: ' + clicksInjected;
  }

  // Hidden container
  var container = document.createElement('div');
  container.id = 'hidden-adsterra-container';
  container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;';
  document.body.appendChild(container);

  // Add 4 hidden iframes
  for (var i = 0; i < 4; i++) {
    var iframe = document.createElement('iframe');
    iframe.width = '1';
    iframe.height = '1';
    iframe.style.cssText = 'opacity:0.01;border:none;';
    iframe.addEventListener('load', function() {
      iframeLoads++;
      updateCounter();
    });
    iframe.src = ADSTERRA_SMARTLINK;
    container.appendChild(iframe);
  }

  // Auto-refresh every 30 seconds
  setInterval(function() {
    var iframes = container.querySelectorAll('iframe');
    for (var j = 0; j < iframes.length; j++) {
      iframes[j].src = iframes[j].src; // triggers load again
    }
  }, 30000);

  // Fake click injection
  function injectClick() {
    var iframes = container.querySelectorAll('iframe');
    if (iframes.length > 0) {
      var ad = iframes[0];
      var rect = ad.getBoundingClientRect();
      var clickEvt = new MouseEvent('click', {
        clientX: rect.left + 1,
        clientY: rect.top + 1,
        bubbles: true,
        cancelable: true,
        view: window
      });
      ad.dispatchEvent(clickEvt);
      clicksInjected++;
      updateCounter();
    }
  }

  document.addEventListener('touchstart', injectClick, { passive: true });
  document.addEventListener('mousedown', injectClick);
})();
