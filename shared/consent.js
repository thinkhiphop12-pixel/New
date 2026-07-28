/* Shared consent / PostHog / AdSense foundation, used by every Ball Knowledge
   page (homepage, 700, lineup). Fill in real IDs below before going live;
   until then loadPostHog/loadAdSense/fillAllAdSlots stay no-ops, and any
   element with class="ad-slot" just shows its placeholder label. */
const POSTHOG_KEY = ''; // e.g. 'phc_xxxxxxxx'
const POSTHOG_HOST = 'https://us.i.posthog.com';
const ADSENSE_CLIENT_ID = 'ca-pub-2741492847457362';

const CONSENT_KEY = 'bk_consent'; // 'all' | 'essential'

function getConsent(){
  try { return localStorage.getItem(CONSENT_KEY); } catch(e){ return null; }
}
function setConsent(choice){
  try { localStorage.setItem(CONSENT_KEY, choice); } catch(e){}
}

function track(event, props){
  try { if (window.posthog) window.posthog.capture(event, props || {}); } catch(e){}
}

function loadPostHog(){
  if (!POSTHOG_KEY || window.posthog) return;
  const s = document.createElement('script');
  s.src = 'https://us-assets.i.posthog.com/static/array.js';
  s.onload = () => {
    window.posthog && window.posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, capture_pageview: true });
  };
  document.head.appendChild(s);
}

function loadAdSense(){
  // Skip if disabled, or if the library is already present — either via a
  // previous call (data-adsense) or the loader snippet hard-coded in <head>
  // for AdSense site verification (matched by its googlesyndication src).
  if (!ADSENSE_CLIENT_ID) return;
  if (document.querySelector('script[data-adsense]') ||
      document.querySelector('script[src*="adsbygoogle.js"]')) { fillAllAdSlots(); return; }
  const s = document.createElement('script');
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.adsense = '1';
  s.onload = fillAllAdSlots;
  document.head.appendChild(s);
}

/* Fills any visible .ad-slot / .ad-placeholder[data-ad-slot] with a real
   AdSense unit, once consent + a real client/slot ID exist. Safe no-op
   until those IDs are filled in above. */
function fillAllAdSlots(){
  if (!ADSENSE_CLIENT_ID || getConsent() !== 'all') return;
  document.querySelectorAll('.ad-slot, .ad-placeholder[data-ad-slot]').forEach(slot => {
    const adSlotId = (slot.dataset.adSlot || '').trim();
    // Only push a REAL (all-digit) AdSense unit. Placeholder ids like
    // "XXXXXXXXXXXXXXXX" (no ad unit created yet) must NOT be pushed — an
    // invalid slot renders an empty box and triggers AdSense policy warnings.
    // Those slots fall through to the Amazon affiliate fallback in ads.js.
    if (!/^\d{6,}$/.test(adSlotId) || slot.classList.contains('is-filled') || slot.offsetParent === null) return;
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.dataset.adClient = ADSENSE_CLIENT_ID;
    ins.dataset.adSlot = adSlotId;
    ins.dataset.adFormat = 'auto';
    ins.dataset.fullWidthResponsive = 'true';
    slot.innerHTML = '';
    slot.appendChild(ins);
    slot.classList.add('is-filled');
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){}
  });
}

/* Monetag Vignette (impression-based, between-page-navigation banner).
   Runs site-wide on the zones in VIGNETTE_ZONES. A page can override the set
   by declaring `window.BK_VIGNETTE_ZONES = ['1234']` (or the older single
   `window.BK_VIGNETTE_ZONE`) BEFORE this script loads, and can opt out
   entirely with `window.BK_VIGNETTE_ZONES = []`.

   Loaded only from applyConsent('all') — never before the visitor accepts. */
const VIGNETTE_ZONES = ['11417067', '11418211'];

function vignetteZones(){
  if (Array.isArray(window.BK_VIGNETTE_ZONES)) return window.BK_VIGNETTE_ZONES;
  if (window.BK_VIGNETTE_ZONE) return [window.BK_VIGNETTE_ZONE];
  return VIGNETTE_ZONES;
}

function loadMonetagVignette(){
  vignetteZones().forEach(function(zone){
    if (!zone) return;
    if (document.querySelector('script[data-zone="' + zone + '"]')) return;
    const s = document.createElement('script');
    s.dataset.zone = zone;
    s.src = 'https://n6wxm.com/vignette.min.js';
    document.body.appendChild(s);
  });
}

function applyConsent(choice){
  setConsent(choice);
  const banner = document.getElementById('consentBanner');
  if (banner) banner.classList.add('hidden');
  if (choice === 'all') {
    loadPostHog(); loadAdSense(); fillAllAdSlots(); loadMonetagVignette();
    if (typeof initAds === 'function') initAds();
  }
}

/* Self-injecting banner: pages that don't ship their own #consentBanner
   markup (homepage, game pages) get one created here, with scoped styles,
   so adding <script src="/shared/consent.js"> is all a page needs. */
function ensureConsentBanner(){
  // Don't create banner in iframes — parent page handles it, and localStorage is shared (same-origin)
  if (window.self !== window.top) return;
  if (document.getElementById('consentBanner')) return;
  if (!document.getElementById('bkConsentStyles')) {
    const style = document.createElement('style');
    style.id = 'bkConsentStyles';
    style.textContent = `
      #consentBanner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1000;
        width:min(94vw,560px);background:#10131a;border:1px solid rgba(255,255,255,.14);
        border-radius:14px;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.5);
        font-family:Inter,system-ui,-apple-system,sans-serif;}
      #consentBanner.hidden{display:none;}
      #consentBanner .consent-text{color:#e8e8ea;font-size:13.5px;line-height:1.5;margin:0 0 12px;}
      #consentBanner .consent-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;}
      #consentBanner button{cursor:pointer;font-weight:700;font-size:13px;border-radius:10px;
        padding:9px 16px;border:1px solid transparent;font-family:inherit;}
      #consentBanner .btn-primary{background:linear-gradient(135deg,#2ab248,#12b380);color:#052411;}
      #consentBanner .btn-ghost{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);color:#fff;}`;
    document.head.appendChild(style);
  }
  const banner = document.createElement('div');
  banner.id = 'consentBanner';
  banner.className = 'consent-banner hidden';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = `
    <p class="consent-text">We use cookies for basic analytics and to show ads that keep these games free. Choose what you're OK with — you can change this anytime via Cookie settings in the footer.</p>
    <div class="consent-actions">
      <button class="btn-ghost" id="consentEssentialBtn">Essential only</button>
      <button class="btn-primary" id="consentAcceptBtn">Accept all</button>
    </div>`;
  document.body.appendChild(banner);
}

function initConsent(){
  const existing = getConsent();
  const banner = document.getElementById('consentBanner');
  if (existing) {
    if (existing === 'all') {
      loadPostHog(); loadAdSense(); fillAllAdSlots(); loadMonetagVignette();
      if (typeof initAds === 'function') initAds();
    }
    return;
  }
  if (banner) banner.classList.remove('hidden');
}

function bkConsentBoot(){
  ensureConsentBanner();
  const acceptBtn = document.getElementById('consentAcceptBtn');
  const essentialBtn = document.getElementById('consentEssentialBtn');
  const settingsBtn = document.getElementById('cookieSettingsBtn');
  const banner = document.getElementById('consentBanner');
  if (acceptBtn) acceptBtn.addEventListener('click', () => applyConsent('all'));
  if (essentialBtn) essentialBtn.addEventListener('click', () => applyConsent('essential'));
  if (settingsBtn) settingsBtn.addEventListener('click', (e) => { e.preventDefault(); banner && banner.classList.remove('hidden'); });
  initConsent();
}

// Run now if the DOM is already parsed (the Next.js games inject this script
// after DOMContentLoaded, so a plain listener would never fire); otherwise wait.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bkConsentBoot);
} else {
  bkConsentBoot();
}
