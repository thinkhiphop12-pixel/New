/* Shared ad infrastructure.
   Adsterra units re-enabled at the site owner's request. All loading stays
   consent-gated (getConsent() === 'all') and capped at two ad surfaces per
   page. The intrusive popunder and direct-link units remain off; only the
   Social Bar and Native unit (the ones with live zones) are active.
   To change ad behaviour, edit the zone constants below. */

const ADSTERRA_SOCIAL_BAR_SRC = 'https://pl29902467.effectivecpmnetwork.com/fe/33/d2/fe33d2be9e814339b1c0fa3d089168a8.js';
const ADSTERRA_BANNER_KEY = '';           // no banner zone configured
const ADSTERRA_NATIVE_SRC = 'https://pl29902468.effectivecpmnetwork.com/14db44511efd6640ca8f50a10426428d/invoke.js';
const ADSTERRA_NATIVE_CONTAINER_ID = 'container-14db44511efd6640ca8f50a10426428d';
const ADSTERRA_POPUNDER_SRC = '';         // intentionally off (intrusive redirects)
const ADSTERRA_DIRECT_LINK = '';          // intentionally off

// Affiliate tracking links — fill in once you have real Amazon Associates /
// Fanatics partner tags. The homepage affiliate block stays hidden until
// both are set (see index.html footer script).
const AFFILIATE_LINKS = {
  amazon: 'https://www.amazon.co.uk/s?k=football+shirts&tag=lloydevans01-21',
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

// ---- Baseline ad-slot styles ----
// Injected so pages that don't load the root styles.css (homepage, Next.js
// game builds) still render slots, the adblock banner and interstitials
// correctly. Skipped when the page already ships .ad-slot styles.
function injectBaseAdStyles(){
  if (document.getElementById('bkAdBaseStyles')) return;
  const style = document.createElement('style');
  style.id = 'bkAdBaseStyles';
  style.textContent = `
    .ad-slot{margin:20px auto;min-height:90px;max-width:728px;display:flex;align-items:center;
      justify-content:center;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.14);
      border-radius:14px;position:relative;overflow:hidden;}
    .ad-slot-label{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8a8a8e;}
    .ad-slot.is-filled .ad-slot-label{display:none;}
    .ad-slot ins.adsbygoogle{width:100%;}
    .ad-slot.ad-load-failed{opacity:.4;}
    .soft-banner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:600;
      max-width:min(92vw,480px);background:#10131a;border:1px solid rgba(255,255,255,.14);
      border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px;
      font-size:13px;color:#e8e8ea;box-shadow:0 8px 24px rgba(0,0,0,.4);}
    .soft-banner-dismiss{background:transparent;border:none;cursor:pointer;color:#8a8a8e;font-size:18px;line-height:1;flex-shrink:0;}
    .interstitial-overlay{position:fixed;inset:0;z-index:900;background:rgba(5,8,6,.88);
      display:flex;align-items:center;justify-content:center;}
    .interstitial-box{background:#10131a;border:1px solid rgba(255,255,255,.14);border-radius:14px;
      padding:18px;width:min(90vw,420px);display:flex;flex-direction:column;gap:14px;}
    .interstitial-ad-slot{margin:0;min-height:200px;}
    .interstitial-skip{align-self:flex-end;background:rgba(255,255,255,.06);color:#e8e8ea;cursor:pointer;
      border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;}
    .interstitial-skip:disabled{color:#8a8a8e;cursor:not-allowed;}
    .sticky-footer-ad{position:fixed;left:0;right:0;bottom:0;z-index:500;margin:0;min-height:50px;
      max-height:90px;border-radius:0;border-width:1px 0 0;max-width:none;}
    .sticky-ad-close{position:absolute;top:4px;right:6px;width:20px;height:20px;border:none;cursor:pointer;
      border-radius:50%;background:#050505;color:#8a8a8e;font-size:14px;line-height:1;
      display:flex;align-items:center;justify-content:center;}`;
  document.head.appendChild(style);
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

// ---- Left side-rail skyscraper (desktop game pages only) ----
// A vertical banner pinned to the left gutter. Only shown on wide screens
// (so it never overlaps the centred game content) and only inside games,
// never the homepage. It REPLACES the social bar on desktop so the page
// still carries at most two ad surfaces (in-content slot + side rail).
function shouldShowSideRail(){
  const wideEnough = window.matchMedia && window.matchMedia('(min-width: 1180px)').matches;
  // Game pages live in a subdirectory (/700/, /boardroom/, …); the homepage is
  // at the site root. Anything with a path segment is a game.
  const segs = window.location.pathname.split('/').filter(s => s && s !== 'index.html');
  const isGamePage = segs.length >= 1;
  return wideEnough && isGamePage;
}

function injectSideRailStyles(){
  if (document.getElementById('sideRailAdStyles')) return;
  const style = document.createElement('style');
  style.id = 'sideRailAdStyles';
  style.textContent = `
    .side-rail-ad{ position:fixed; left:12px; top:50%; transform:translateY(-50%);
      width:160px; height:600px; z-index:40; display:flex; align-items:center;
      justify-content:center; background:rgba(0,0,0,.18);
      border:1px solid rgba(255,255,255,.10); border-radius:10px;
      overflow:hidden; }
    .side-rail-ad .ad-slot-label{ font-size:10px; letter-spacing:.12em;
      text-transform:uppercase; opacity:.45; }
    @media (max-width: 1179px){ .side-rail-ad{ display:none !important; } }`;
  document.head.appendChild(style);
}

function initSideRailAd(){
  if (adsRemoved() || getConsent() !== 'all') return;
  if (document.getElementById('sideRailAd')) return;
  injectSideRailStyles();
  const el = document.createElement('div');
  el.id = 'sideRailAd';
  el.className = 'ad-slot side-rail-ad';
  el.dataset.adKind = 'banner';
  el.innerHTML = '<span class="ad-slot-label">Advertisement</span>';
  document.body.appendChild(el);
  fillAdSlot(el);
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
  injectBaseAdStyles();
  // Capped at 2 ad surfaces per page (one in-content slot + one side surface)
  // per product decision — sticky footer and popunder stay disabled. On wide
  // game screens the second surface is the left side-rail; everywhere else
  // (homepage, narrow/mobile) it's the social bar.
  initLazyAds();
  if (shouldShowSideRail()) {
    initSideRailAd();
  } else {
    initSocialBar();
  }
  setTimeout(detectAdblockAndPrompt, 500);
}

function bkAdsBoot(){ if (getConsent() === 'all') initAds(); }

// Run now if the DOM is already parsed (the Next.js games inject this script
// after DOMContentLoaded); otherwise wait for it.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bkAdsBoot);
} else {
  bkAdsBoot();
}
