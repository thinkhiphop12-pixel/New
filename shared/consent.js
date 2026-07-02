/* Shared consent / PostHog / AdSense foundation, used by every Ball Knowledge
   page (homepage, perfect-cup, dynasty, lineup). Fill in real IDs below before going live;
   until then loadPostHog/loadAdSense/fillAllAdSlots stay no-ops, and any
   element with class="ad-slot" just shows its placeholder label. */
const POSTHOG_KEY = ''; // e.g. 'phc_xxxxxxxx'
const POSTHOG_HOST = 'https://us.i.posthog.com';
const ADSENSE_CLIENT_ID = ''; // e.g. 'ca-pub-xxxxxxxxxxxxxxxx'

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
  if (!ADSENSE_CLIENT_ID || document.querySelector('script[data-adsense]')) return;
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
    const adSlotId = slot.dataset.adSlot;
    if (!adSlotId || slot.classList.contains('is-filled') || slot.offsetParent === null) return;
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

function applyConsent(choice){
  setConsent(choice);
  const banner = document.getElementById('consentBanner');
  if (banner) banner.classList.add('hidden');
  if (choice === 'all') {
    loadPostHog(); loadAdSense(); fillAllAdSlots();
    if (typeof initAds === 'function') initAds();
  }
}

function initConsent(){
  const existing = getConsent();
  const banner = document.getElementById('consentBanner');
  if (existing) {
    if (existing === 'all') {
      loadPostHog(); loadAdSense(); fillAllAdSlots();
      if (typeof initAds === 'function') initAds();
    }
    return;
  }
  if (banner) banner.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const acceptBtn = document.getElementById('consentAcceptBtn');
  const essentialBtn = document.getElementById('consentEssentialBtn');
  const settingsBtn = document.getElementById('cookieSettingsBtn');
  const banner = document.getElementById('consentBanner');
  if (acceptBtn) acceptBtn.addEventListener('click', () => applyConsent('all'));
  if (essentialBtn) essentialBtn.addEventListener('click', () => applyConsent('essential'));
  if (settingsBtn) settingsBtn.addEventListener('click', () => banner && banner.classList.remove('hidden'));
  initConsent();
});
