/* Shared Adsterra ad infrastructure, used alongside shared/consent.js.
   Fill in real zone IDs below before going live; until then every loader
   stays a no-op and .ad-slot elements just show their placeholder label.
   Everything here only runs once the user has accepted full consent
   (see shared/consent.js applyConsent('all')). */

// ---- Fill these in with real Adsterra zone/script IDs ----
// Social Bar + Popunder are self-injecting "just drop the script tag" units,
// which is what these two are. Banner/Native units use a different snippet
// shape (script + a matching <div id="container-...">) — still pending real
// codes for those, so sidebar/sticky-footer/in-content/interstitial slots
// stay inert placeholders until that's filled in.
const ADSTERRA_SOCIAL_BAR_SRC = 'https://pl29902467.effectivecpmnetwork.com/fe/33/d2/fe33d2be9e814339b1c0fa3d089168a8.js';
const ADSTERRA_BANNER_KEY = '';     // banner zone key, used for sidebar/sticky-footer banners
// Native Banner unit — Adsterra ties this to one fixed container id, so it
// can only be rendered into a single slot per page (in-content placement).
const ADSTERRA_NATIVE_SRC = 'https://pl29902468.effectivecpmnetwork.com/14db44511efd6640ca8f50a10426428d/invoke.js';
const ADSTERRA_NATIVE_CONTAINER_ID = 'container-14db44511efd6640ca8f50a10426428d';
// Popunder disabled by product decision — random-click redirects to ad
// landing pages felt too disruptive on a brand-new site. Leave src empty
// (every popunder call below already no-ops on an empty src) so it's a
// one-line re-enable later if wanted.
const ADSTERRA_POPUNDER_SRC = '';
const ADSTERRA_DIRECT_LINK = '';    // direct-link URL for "Get Hints" style placements

// Affiliate tracking links — fill in once you have real Amazon Associates /
// Fanatics partner tags. The homepage affiliate block stays hidden until
// both are set (see index.html footer script).
const AFFILIATE_LINKS = {
  amazon: '',   // e.g. 'https://www.amazon.com/s?k=football+gear&tag=yourtag-20'
  fanatics: ''  // e.g. 'https://www.fanatics.com/...?affid=yourid'
};

const ADS_REFRESH_MS = 45000;       // refresh a viewable ad slot at most this often
const POPUNDER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // once per day per browser
const REMOVE_ADS_KEY = 'bk_remove_ads'; // local-only flag; see note in revenue dashboard re: real payments

function adsRemoved(){
  try { return localStorage.getItem(REMOVE_ADS_KEY) === '1'; } catch(e){ return false; }
}

// ---- Lightweight local impression/click counters ----
// There's no backend behind this site, so this can't produce real
// cross-user revenue numbers — it's a per-browser counter only, used to
// drive the local preview dashboard (admin/revenue.html).
function recordAdEvent(placement, kind){
  try {
    const key = 'bk_ad_stats';
    const stats = JSON.parse(localStorage.getItem(key) || '{}');
    stats[placement] = stats[placement] || { impressions: 0, clicks: 0 };
    stats[placement][kind === 'click' ? 'clicks' : 'impressions']++;
    localStorage.setItem(key, JSON.stringify(stats));
  } catch(e){}
  track(`ad_${kind}`, { placement });
}

// ---- A/B test framework ----
// Sticky per-browser variant assignment, exposed for any feature to read.
function getABVariant(testName, variants){
  variants = variants || ['a', 'b'];
  try {
    const key = `bk_ab_${testName}`;
    let v = localStorage.getItem(key);
    if (!v || !variants.includes(v)) {
      v = variants[Math.floor(Math.random() * variants.length)];
      localStorage.setItem(key, v);
      track('ab_assigned', { test: testName, variant: v });
    }
    return v;
  } catch(e){ return variants[0]; }
}

// ---- Adsterra script loader with fallback ----
// If a script 404s/errors (zone not live, blocked, etc.) we fail soft —
// no thrown errors, ad slot just keeps its placeholder.
function loadAdsterraScript(src, container){
  if (!src) return;
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  s.onerror = () => { if (container) container.classList.add('ad-load-failed'); };
  (container || document.head).appendChild(s);
}

// ---- Lazy load + viewable refresh for .ad-slot elements ----
function initLazyAds(){
  if (!('IntersectionObserver' in window)) { fillAllAdSlotsAdsterra(); return; }
  const seen = new WeakMap();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const slot = entry.target;
      if (entry.isIntersecting) {
        if (!slot.classList.contains('is-filled')) {
          fillAdSlot(slot);
        }
        if (!seen.has(slot)) {
          seen.set(slot, setInterval(() => {
            if (document.visibilityState === 'visible' && slot.offsetParent !== null) {
              refreshAdSlot(slot);
            }
          }, ADS_REFRESH_MS));
        }
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.ad-slot').forEach(slot => observer.observe(slot));
}

function fillAdSlot(slot){
  if (adsRemoved() || getConsent() !== 'all') return;
  const kind = slot.dataset.adKind || 'banner';
  if (kind === 'native') {
    if (document.getElementById(ADSTERRA_NATIVE_CONTAINER_ID)) return; // one native unit per page
    const div = document.createElement('div');
    div.id = ADSTERRA_NATIVE_CONTAINER_ID;
    slot.appendChild(div);
    loadAdsterraScript(ADSTERRA_NATIVE_SRC, slot);
  } else if (ADSTERRA_BANNER_KEY) {
    loadAdsterraScript(`//pl-banner.adsterra.placeholder/${ADSTERRA_BANNER_KEY}.js`, slot);
  } else {
    return; // no zone configured yet — leave placeholder showing
  }
  slot.classList.add('is-filled');
  recordAdEvent(slot.id || kind, 'impression');
}

function refreshAdSlot(slot){
  if (adsRemoved() || getConsent() !== 'all') return;
  if (slot.dataset.adKind === 'native') return; // native unit's own script self-manages, load once
  slot.classList.remove('is-filled');
  fillAdSlot(slot);
}

function fillAllAdSlotsAdsterra(){
  document.querySelectorAll('.ad-slot:not(.is-filled)').forEach(fillAdSlot);
}

// ---- Anti-adblock soft recovery ----
// Detects a blocked bait element and shows a polite, dismissible banner
// asking the user to consider whitelisting the site. No cloaking/evasion —
// just a normal "please consider disabling adblock" prompt.
function detectAdblockAndPrompt(){
  if (adsRemoved() || getConsent() !== 'all') return;
  const bait = document.createElement('div');
  bait.className = 'ad-slot ad-banner ads adsbox';
  bait.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(bait);
  setTimeout(() => {
    const blocked = bait.offsetParent === null || bait.offsetHeight === 0;
    bait.remove();
    if (blocked) showAdblockBanner();
  }, 300);
}

function showAdblockBanner(){
  if (document.getElementById('adblockBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'adblockBanner';
  banner.className = 'soft-banner';
  banner.innerHTML = `
    <span>👋 Looks like you're using an ad blocker. Ads keep these games free — consider whitelisting us!</span>
    <button class="soft-banner-dismiss" aria-label="Dismiss">&times;</button>
  `;
  document.body.appendChild(banner);
  banner.querySelector('.soft-banner-dismiss').addEventListener('click', () => banner.remove());
  recordAdEvent('adblock_banner', 'impression');
}

// ---- Social bar (always-on, highest CPM per task spec) ----
function initSocialBar(){
  if (adsRemoved() || getConsent() !== 'all' || !ADSTERRA_SOCIAL_BAR_SRC) return;
  loadAdsterraScript(ADSTERRA_SOCIAL_BAR_SRC);
  recordAdEvent('social_bar', 'impression');
}

// ---- Sticky footer anchor (mobile only) ----
function initStickyFooterAd(){
  if (adsRemoved() || getConsent() !== 'all') return;
  if (window.matchMedia && !window.matchMedia('(max-width: 768px)').matches) return;
  if (document.getElementById('stickyFooterAd')) return;
  const el = document.createElement('div');
  el.id = 'stickyFooterAd';
  el.className = 'ad-slot sticky-footer-ad';
  el.dataset.adKind = 'banner';
  el.innerHTML = '<span class="ad-slot-label">Advertisement</span><button class="sticky-ad-close" aria-label="Close">&times;</button>';
  document.body.appendChild(el);
  el.querySelector('.sticky-ad-close').addEventListener('click', () => el.remove());
  fillAdSlot(el);
}

// ---- Exit-intent popunder (desktop only, capped once/day) ----
function initExitIntentPopunder(){
  if (adsRemoved() || getConsent() !== 'all' || !ADSTERRA_POPUNDER_SRC) return;
  if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return;
  const key = 'bk_popunder_last';
  let fired = false;
  document.addEventListener('mouseleave', (e) => {
    if (fired || e.clientY > 0) return;
    try {
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last < POPUNDER_COOLDOWN_MS) return;
      localStorage.setItem(key, String(Date.now()));
    } catch(err){ return; }
    fired = true;
    loadAdsterraScript(ADSTERRA_POPUNDER_SRC);
    recordAdEvent('exit_popunder', 'impression');
  });
}

// ---- Pre-game interstitial: 5s, skippable after 3s ----
// Reusable across any game's "start" action. Calls onContinue when the
// player can proceed (either by skipping or the timer running out).
function showInterstitial(onContinue){
  if (adsRemoved() || getConsent() !== 'all') { onContinue(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'interstitial-overlay';
  overlay.innerHTML = `
    <div class="interstitial-box">
      <div class="ad-slot interstitial-ad-slot" data-ad-kind="banner"><span class="ad-slot-label">Advertisement</span></div>
      <button class="interstitial-skip" disabled>Skip in 3s</button>
    </div>
  `;
  document.body.appendChild(overlay);
  fillAdSlot(overlay.querySelector('.ad-slot'));
  recordAdEvent('pregame_interstitial', 'impression');

  const skipBtn = overlay.querySelector('.interstitial-skip');
  let secondsLeft = 3;
  const tick = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(tick);
      skipBtn.disabled = false;
      skipBtn.textContent = 'Skip ▶';
    } else {
      skipBtn.textContent = `Skip in ${secondsLeft}s`;
    }
  }, 1000);

  const finish = () => { clearInterval(tick); overlay.remove(); onContinue(); };
  skipBtn.addEventListener('click', () => { if (!skipBtn.disabled) finish(); });
  setTimeout(finish, 5000); // hard cap regardless of skip state
}

// ---- Direct link wrapper (for "Get Hints" style buttons) ----
// Opens the configured Adsterra Direct Link in a background tab, throttled
// so the same browser doesn't get hit on every single click.
function fireDirectLinkAd(placement){
  if (adsRemoved() || getConsent() !== 'all' || !ADSTERRA_DIRECT_LINK) return;
  try {
    const key = `bk_directlink_${placement}`;
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < 60000) return; // at most once/minute per placement
    localStorage.setItem(key, String(Date.now()));
  } catch(e){ return; }
  window.open(ADSTERRA_DIRECT_LINK, '_blank', 'noopener');
  recordAdEvent(placement, 'click');
}

function initAds(){
  if (adsRemoved() || getConsent() !== 'all') return;
  // Capped at 2 ad surfaces per page (one in-content slot + the social
  // bar) per product decision — sticky footer and popunder stay disabled.
  initLazyAds();
  initSocialBar();
  setTimeout(detectAdblockAndPrompt, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  if (getConsent() === 'all') initAds();
});
