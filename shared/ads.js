/* ==============================================================
   Ads engine — legit monetization only.
   - In-content AdSense banners (rendered only when a slot has a REAL
     numeric ad-slot ID; the placeholder "XXXX" slots stay a fallback).
   - Amazon affiliate fallback card fills any slot no ad network claimed,
     so a visitor never sees an empty box. Earns via the Associates tag,
     needs no approval.
   - Lazy load on real viewport visibility. No auto-scroll, no idle
     impression manipulation, no cookie stuffing — those violate Google
     AdSense / Amazon Associates policy and get accounts banned.
   All loading stays consent-gated (getConsent() === 'all').
   ============================================================== */

// ========== CONFIGURATION ==========
const CONFIG = {
  ADSENSE_CLIENT: 'ca-pub-2741492847457362',
  AMAZON_TAG: 'lloydevans01-21',
  EBAY_CAMPID: '5338345975',   // eBay Partner Network campaign ID
  AFFILIATE_ROTATE: true,       // alternate Amazon/eBay so both programs earn
  PRELOAD_OFFSET: 200,   // px of preload margin for lazy loading (legit)
  ADBLOCK_NOTICE: true,  // polite, dismissible whitelist prompt only
};

// Affiliate search links built from each program's tag/campaign ID.
// These are honest, disclosed affiliate links (rel=sponsored) — the cookie
// is only set when the user actually clicks through, exactly as the
// Associates/ePN programs intend. No hidden iframes, no pixel tracking,
// no auto-redirects — that would be cookie stuffing and gets accounts banned.
const AMAZON_AFFILIATE_URL = `https://www.amazon.co.uk/s?k=football+shirts&tag=${CONFIG.AMAZON_TAG}`;
const EBAY_AFFILIATE_URL = `https://www.ebay.co.uk/sch/i.html?_nkw=football+shirts&campid=${CONFIG.EBAY_CAMPID}&customid=ballknw`;

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
      border-radius:16px;position:relative;overflow:hidden;}
    .ad-slot-label{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8e;}
    .ad-slot.is-filled .ad-slot-label{display:none;}
    .ad-slot ins.adsbygoogle{width:100%;}
    .ad-slot .ad-load-error{color:#666;font-size:12px;padding:10px;}
    /* Amazon affiliate fallback card (fills any slot no ad network claimed) */
    .ad-slot.is-affiliate{background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.08);padding:16px 18px;text-align:left;}
    .aff-card{display:flex;align-items:center;gap:14px;width:100%;justify-content:space-between;flex-wrap:wrap;flex-direction:row;}
    .aff-card-txt{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}
    .aff-card-kicker{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8e;font-weight:600;}
    .aff-card-title{font-size:14px;font-weight:700;color:#e8e8ea;font-family:Inter,system-ui,sans-serif;line-height:1.2;margin:2px 0;}
    .aff-card-sub{font-size:12.5px;color:#8a8a8e;line-height:1.4;margin:4px 0 0;}
    .aff-card-cta{flex-shrink:0;background:none;color:#b8ff3c;
      font-weight:700;font-size:13px;text-decoration:none;border-radius:0;padding:8px 4px;white-space:nowrap;
      font-family:Inter,system-ui,sans-serif;display:inline-block;margin-left:12px;}
    .aff-card-cta:hover{text-decoration:underline}
    .soft-banner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:600;
      max-width:min(92vw,480px);background:#10131a;border:1px solid rgba(255,255,255,.14);
      border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;
      font-size:13px;color:#e8e8ea;box-shadow:0 8px 24px rgba(0,0,0,.4);}
    .soft-banner-dismiss{background:transparent;border:none;cursor:pointer;color:#8a8a8e;font-size:18px;line-height:1;flex-shrink:0;}`;
  document.head.appendChild(style);
}

// ========== SLOT ID CHECK ==========
// A real AdSense slot ID is all digits. The pages currently ship placeholder
// "XXXXXXXXXXXXXXXX" ids (no real ad units created yet) — those must NOT be
// pushed to AdSense (invalid slot = policy warning + a broken empty box), so
// they fall through to the affiliate card until real ids are pasted in.
function hasRealSlotId(slot) {
  const id = (slot.dataset.adSlot || '').trim();
  return /^\d{6,}$/.test(id);
}

// ========== AMAZON AFFILIATE FALLBACK ==========
// Turns any ad slot no network filled into a tasteful, on-brand merch card.
// Needs no ad-network approval — earns via the Amazon Associates tag — so no
// slot is ever left as an empty box. Real ads win when they serve; this is
// only a backfill. This is an honest, disclosed affiliate link (rel=sponsored)
// — NOT cookie stuffing: the cookie is only set by Amazon when the user
// actually clicks through, exactly as the Associates program intends.
function fillSlotWithAffiliate(slot) {
  if (adsRemoved() || getConsent() !== 'all') return false;
  if (!CONFIG.AMAZON_TAG && !CONFIG.EBAY_CAMPID) return false;
  if (slot.classList.contains('is-affiliate')) { slot.classList.add('is-filled'); return true; }

  // Rotate between Amazon and eBay so both programs earn commissions.
  // Alternation is deterministic per-slot so a given slot doesn't flicker
  // between stores on re-renders.
  const useEbay = CONFIG.AFFILIATE_ROTATE && CONFIG.EBAY_CAMPID &&
    (slot.dataset.adSlot || slot.id || '').length % 2 === 1;
  const store = useEbay ? 'eBay' : 'Amazon';
  const url = useEbay ? EBAY_AFFILIATE_URL : AMAZON_AFFILIATE_URL;

  slot.innerHTML = `
    <div class="aff-card">
      <div class="aff-card-txt">
        <span class="aff-card-kicker">Football gear · sponsored</span>
        <span class="aff-card-title">Shirts, boots &amp; kit</span>
        <span class="aff-card-sub">Shop the latest football shirts and gear on ${store}.</span>
      </div>
      <a class="aff-card-cta" href="${url}" target="_blank" rel="sponsored noopener">Browse →</a>
    </div>`;
  slot.classList.add('is-filled', 'is-affiliate');
  const cta = slot.querySelector('.aff-card-cta');
  if (cta) cta.addEventListener('click', () => recordAdEvent(slot.id || 'affiliate', 'click'));
  recordAdEvent(slot.id || 'affiliate', 'impression');
  return true;
}

// ========== RENDER A SLOT ==========
const pushedSlots = new WeakSet();

function renderAdSenseSlot(slot) {
  if (!slot || pushedSlots.has(slot) || slot.classList.contains('is-filled')) return;
  if (adsRemoved() || getConsent() !== 'all') return;

  // No real ad unit yet (placeholder id) or AdSense library unavailable →
  // show the affiliate card instead of an empty/broken box.
  if (!hasRealSlotId(slot) || typeof window.adsbygoogle === 'undefined') {
    fillSlotWithAffiliate(slot);
    return;
  }

  let ins = slot.querySelector('ins.adsbygoogle');
  if (!ins) {
    ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', CONFIG.ADSENSE_CLIENT);
    ins.setAttribute('data-ad-slot', slot.dataset.adSlot);
    ins.setAttribute('data-ad-format', slot.dataset.adFormat || 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    slot.prepend(ins);
  }
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    pushedSlots.add(slot);
    slot.classList.add('is-filled');
    recordAdEvent(slot.id || 'banner', 'impression');
  } catch (e) {
    // AdSense failed to render — fall back to the affiliate card.
    const oldIns = slot.querySelector('ins.adsbygoogle');
    if (oldIns) oldIns.remove();
    fillSlotWithAffiliate(slot);
  }
}

// ========== LAZY LOAD (real viewport visibility only) ==========
function initLazyAds() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.ad-slot:not(.is-filled)').forEach(renderAdSenseSlot);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const slot = entry.target;
        if (!slot.classList.contains('is-filled')) renderAdSenseSlot(slot);
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
      renderAdSenseSlot(slot);
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

window.renderAdSenseSlot = renderAdSenseSlot;
window.initAds = initAds;
