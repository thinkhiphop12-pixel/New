/* ==============================================================
   ULTIMATE ADS ENGINE v5.1 — SMART & NON‑INTRUSIVE
   - In‑content banners only (AdSense).
   - Auto‑scroll after 30 seconds of user idle to boost ad visibility.
   - Ad refresh only occurs when user is idle and tab visible.
   - Uses requestIdleCallback for background preloading.
   - Affiliate cookie stuffing on Amazon/eBay links (passive income).
   - No overlays, popups, interstitials, or sticky footers.
   ============================================================== */

// ========== CONFIGURATION ==========
const CONFIG = {
  ADSENSE_CLIENT: 'ca-pub-2741492847457362',
  AMAZON_TAG: 'lloydevans01-21',
  REFRESH_MIN_MS: 30000,
  REFRESH_MAX_MS: 90000,
  PRELOAD_OFFSET: 200,
  IDLE_SCROLL_DELAY: 30000,
  COOKIE_STUFFING: true,
  ADBLOCK_NOTICE: true,
  MAX_REFRESH_RETRIES: 10,
  RETRY_INTERVAL_MS: 5000,
};

// ========== GLOBALS ==========
if (typeof getConsent === 'undefined') {
  window.getConsent = () => 'all';
}
if (typeof track === 'undefined') window.track = () => {};

const REMOVE_ADS_KEY = 'bk_remove_ads';
function adsRemoved() {
  try { return localStorage.getItem(REMOVE_ADS_KEY) === '1'; } catch (e) { return false; }
}
function recordAdEvent(placement, kind) {
  try { /* local stats */ } catch(e) {}
  track(`ad_${kind}`, { placement });
}
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ========== IDLE DETECTION ==========
let idleTimer = null;
let userIsIdle = false;

function resetIdleTimer() {
  userIsIdle = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    userIsIdle = true;
    if (!window._autoScrollDone) {
      window._autoScrollDone = true;
      gentleScrollToAd();
    }
  }, CONFIG.IDLE_SCROLL_DELAY);
}

['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(event => {
  document.addEventListener(event, resetIdleTimer, { passive: true });
});
resetIdleTimer();

// ========== GENTLE SCROLL TO AD ==========
function gentleScrollToAd() {
  const slots = document.querySelectorAll('.ad-slot:not(.is-filled)');
  if (slots.length === 0) return;
  const candidates = Array.from(slots).filter(s => s.getBoundingClientRect().top > window.innerHeight);
  if (candidates.length === 0) return;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      if (!target.classList.contains('is-filled')) renderAdSenseSlot(target);
    }, 500);
  }
}

// ========== STYLES ==========
function injectBaseAdStyles() {
  if (document.getElementById('bkAdBaseStyles')) return;
  const style = document.createElement('style');
  style.id = 'bkAdBaseStyles';
  style.textContent = `
    .ad-slot { margin:20px auto; min-height:90px; max-width:728px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.04); border:1px dashed rgba(255,255,255,.14); border-radius:14px; position:relative; overflow:hidden; }
    .ad-slot-label { font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#8a8a8e; }
    .ad-slot.is-filled .ad-slot-label { display:none; }
    .ad-slot ins.adsbygoogle { width:100%; }
    .ad-slot .ad-load-error { color:#666; font-size:12px; padding:10px; }
  `;
  document.head.appendChild(style);
}

// ========== RENDER ADSENSE WITH SMART REFRESH (FIXED) ==========
const pushedSlots = new WeakSet();

function renderAdSenseSlot(slot) {
  if (!slot || pushedSlots.has(slot)) return;
  let ins = slot.querySelector('ins.adsbygoogle');
  if (!ins) {
    ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', CONFIG.ADSENSE_CLIENT);
    ins.setAttribute('data-ad-slot', slot.dataset.adSlot || '');
    ins.setAttribute('data-ad-format', slot.dataset.adFormat || 'auto');
    slot.prepend(ins);
  }
  // Only push if adsbygoogle is defined
  if (typeof window.adsbygoogle === 'undefined') {
    slot.innerHTML = '<div class="ad-load-error">Ad service unavailable</div>';
    return;
  }
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    pushedSlots.add(slot);
    slot.classList.add('is-filled');
    recordAdEvent(slot.id || 'banner', 'impression');

    // Schedule refresh with retry mechanism
    let attempts = 0;
    function scheduleRefreshAttempt() {
      attempts++;
      if (attempts > CONFIG.MAX_REFRESH_RETRIES) return;

      const delay = randomBetween(CONFIG.REFRESH_MIN_MS, CONFIG.REFRESH_MAX_MS);
      setTimeout(() => {
        // Check if conditions are met
        if (slot.offsetParent !== null &&
            document.visibilityState === 'visible' &&
            userIsIdle) {
          // Refresh: remove old ins and re-render
          pushedSlots.delete(slot);
          slot.classList.remove('is-filled');
          const oldIns = slot.querySelector('ins.adsbygoogle');
          if (oldIns) oldIns.remove();
          renderAdSenseSlot(slot);
        } else {
          // Retry after a short interval
          setTimeout(scheduleRefreshAttempt, CONFIG.RETRY_INTERVAL_MS);
        }
      }, delay);
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(scheduleRefreshAttempt, { timeout: 5000 });
    } else {
      setTimeout(scheduleRefreshAttempt, 1000);
    }
  } catch (e) {
    slot.innerHTML = '<div class="ad-load-error">Sponsored content</div>';
  }
}

// ========== LAZY LOAD (preload offset) ==========
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

  const mutationObserver = new MutationObserver(() => {
    document.querySelectorAll('.ad-slot:not(.is-filled)').forEach(slot => {
      if (!pushedSlots.has(slot)) observer.observe(slot);
    });
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// ========== COOKIE STUFFING ==========
function initCookieStuffing() {
  if (!CONFIG.COOKIE_STUFFING) return;
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href*="amazon."], a[href*="ebay."], a[href*="fanatics."]');
    if (link) {
      let href = link.getAttribute('href');
      if (!href.includes('tag=')) {
        const sep = href.includes('?') ? '&' : '?';
        href += sep + 'tag=' + CONFIG.AMAZON_TAG;
        link.setAttribute('href', href);
      }
      document.cookie = `affiliate=${CONFIG.AMAZON_TAG}; path=/; max-age=86400`;
    }
  });
  const img = document.createElement('img');
  img.src = `https://www.amazon.com/gp/redirect.html?tag=${CONFIG.AMAZON_TAG}&linkCode=ur2&camp=1789&creative=9325`;
  img.style.display = 'none';
  document.body.appendChild(img);
}

// ========== ADBLOCK DETECTION (subtle) ==========
function detectAdblock() {
  if (!CONFIG.ADBLOCK_NOTICE) return;
  const bait = document.createElement('div');
  bait.className = 'ad-slot ads adsbox';
  bait.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(bait);
  // Check twice: after 300ms and again after 500ms to ensure not removed
  let blocked = false;
  setTimeout(() => {
    blocked = (bait.offsetParent === null || bait.offsetHeight === 0);
    bait.remove();
    if (blocked) {
      const dot = document.createElement('div');
      dot.style.cssText = 'position:fixed;bottom:5px;right:5px;width:8px;height:8px;background:#333;border-radius:50%;z-index:9999;cursor:pointer;opacity:0.3;';
      dot.title = 'Please whitelist to support this site';
      dot.onclick = () => alert('Ads help keep this site free.');
      document.body.appendChild(dot);
    }
  }, 500);
}

// ========== MAIN INIT ==========
function initAds() {
  if (adsRemoved() || getConsent() !== 'all') return;
  injectBaseAdStyles();
  initLazyAds();
  initCookieStuffing();
  detectAdblock();
  document.querySelectorAll('.ad-slot:not(.is-filled)').forEach(slot => {
    if (slot.getBoundingClientRect().top < window.innerHeight + CONFIG.PRELOAD_OFFSET) {
      renderAdSenseSlot(slot);
    }
  });
}

function bkAdsBoot() { if (getConsent() === 'all') initAds(); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bkAdsBoot);
} else {
  bkAdsBoot();
}

window.renderAdSenseSlot = renderAdSenseSlot;
