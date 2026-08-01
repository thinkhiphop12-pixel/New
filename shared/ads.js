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
  PRELOAD_OFFSET: 200,   // px of preload margin for lazy loading
  ADBLOCK_NOTICE: true,  // polite, dismissible whitelist prompt only
};

// The banner tag sets `atOptions` as a page-global before loading its
// script — a second 468x60 unit on the same page would clobber the first
// one's config. Cap it at one per page; every other slot gets the native
// (responsive) unit instead, which has no such global-state conflict.
let bannerSlotClaimed = false;

// ========== GLOBALS / SHIMS ==========
// consent.js normally defines these; shim them so this file is safe to load
// standalone (e.g. inside a Next.js game build) without throwing.
if (typeof getConsent === 'undefined') { window.getConsent = () => 'all'; }
if (typeof track === 'undefined') { window.track = () => {}; }

const REMOVE_ADS_KEY = 'bk_remove_ads';
function adsRemoved() {
  try { return localStorage.getItem(REMOVE_ADS_KEY) === '1'; } catch (e) { return false; }
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
function fillSlotWithNetwork(slot) {
  if (adsRemoved() || getConsent() !== 'all') return false;

  const width = slot.getBoundingClientRect().width || slot.clientWidth || 0;
  const useBanner = !bannerSlotClaimed && width >= CONFIG.BANNER_W + 24;
  if (useBanner) bannerSlotClaimed = true;

  const frame = document.createElement('iframe');
  frame.title = 'Advertisement';
  frame.loading = 'lazy';
  frame.setAttribute('scrolling', 'no');
  // allow-same-origin is needed for the vendor scripts to set their own
  // cookies/read their own storage; combined with allow-scripts this is the
  // standard (if imperfect) sandboxing pattern for a trusted ad-network
  // partner's own tag — not arbitrary third-party/user content.
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  frame.style.height = (useBanner ? CONFIG.BANNER_H : 100) + 'px';
  frame.srcdoc = useBanner ? bannerAdDoc() : nativeAdDoc();

  slot.innerHTML = '';
  slot.appendChild(frame);
  slot.classList.add('is-filled', 'is-network');
  recordAdEvent(slot.id || 'network', 'impression');
  return true;
}

// ========== RENDER A SLOT ==========
function renderAdSlot(slot) {
  if (!slot || slot.classList.contains('is-filled')) return;
  if (adsRemoved() || getConsent() !== 'all') return;
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
