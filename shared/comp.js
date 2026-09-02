/* Referral prize draw — popup + share-link logic.
 *
 * SCOPE: this file is the CLIENT half only. It generates share links, captures
 * inbound ?ref= codes, and renders the entry modal. It deliberately does NOT
 * decide how many entries anyone has: nothing here can be trusted, because a
 * visitor can edit localStorage and forge any value they like. Entry counts,
 * de-duplication and the winner draw MUST be settled server-side against the
 * API contract below. Until COMP.api points at a live backend the modal tells
 * visitors entries are not open yet rather than pretending to enrol them.
 *
 * API CONTRACT the backend needs to implement:
 *   POST {api}/comp/enter   { email, ageConfirmed }  -> 200 { code, entries }
 *                                                       409 { error:'duplicate' }
 *   POST {api}/comp/refer   { ref, visit }           -> 200 { ok:true }
 *   GET  {api}/comp/status?code=CODE                 -> 200 { entries }
 *
 * The server is responsible for: verifying the email actually exists (send a
 * confirmation link — an unverified address is one bot away from unlimited
 * entries), rejecting self-referral, rate limiting by IP, collapsing duplicate
 * devices, and holding the authoritative entry count.
 */

/* ── CONFIG ──
   Everything a non-developer needs to change lives here. `enabled` stays false
   until the backend, the terms page and the legal review are all actually done —
   flipping it on is the single switch that starts the promotion. */
var COMP = {
  enabled: false,
  api: '',                                   // e.g. '/api' or 'https://api.ballknw.com'
  prize: 'two tickets to the UEFA Champions League Final',
  closesISO: '',                             // e.g. '2027-04-30T23:59:59Z' — shown to entrants
  termsUrl: '/competition-terms.html',
  minAge: 18,
  shareBase: 'https://www.ballknw.com/',
  /* Don't interrupt someone who just arrived — let them see the game first.
     Shown only after this much time on site, and never on the first pageview. */
  showAfterMs: 45000,
  minPageviews: 2,
  /* If they dismiss it, leave them alone for this long. */
  snoozeDays: 7
};

var K_CODE = 'bk_comp_code';   // this browser's own referral code, once entered
var K_REF = 'bk_comp_ref';     // inbound code this browser was referred by
var K_SNOOZE = 'bk_comp_snooze';
var K_VIEWS = 'bk_comp_views';
var K_DONE = 'bk_comp_converted';

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function compTrack(event, props) {
  try { if (window.posthog) window.posthog.capture(event, props || {}); } catch (e) {}
}

/* ── INBOUND REFERRAL CAPTURE ──
   Runs on every pageview, before the modal logic, because someone arriving on a
   ?ref= link needs recording even if they never open the popup. */
function captureInboundRef() {
  var ref;
  try { ref = new URLSearchParams(window.location.search).get('ref'); } catch (e) { return; }
  if (!ref) return;
  ref = String(ref).slice(0, 64).replace(/[^A-Za-z0-9_-]/g, '');
  if (!ref) return;

  /* Self-referral: someone pasting their own link back into their own browser.
     Harmless but pointless to record; the server rejects it too. */
  if (ref === lsGet(K_CODE)) { stripRefFromUrl(); return; }

  /* First referrer wins. Overwriting would let a second link steal an
     attribution the first one earned, which is the classic way these get gamed. */
  if (!lsGet(K_REF)) {
    lsSet(K_REF, ref);
    compTrack('comp_referral_landed', { ref: ref });
  }
  stripRefFromUrl();
}

/* Remove ?ref= from the address bar. Two reasons: the visitor shouldn't
   re-share a URL carrying someone else's code, and it keeps the parameter out
   of analytics path reports and off any URL a crawler might find. */
function stripRefFromUrl() {
  try {
    var url = new URL(window.location.href);
    if (!url.searchParams.has('ref')) return;
    url.searchParams.delete('ref');
    var q = url.searchParams.toString();
    window.history.replaceState({}, '', url.pathname + (q ? '?' + q : '') + url.hash);
  } catch (e) {}
}

/* ── CONVERSION ──
   Called by the game when a visitor does something that actually counts —
   completing a season, not merely loading a page. Clicks are trivially farmed;
   a finished season is not. The game should call:
       window.BKComp && window.BKComp.markConverted();
   Idempotent: only the first call per browser posts anything. */
function markConverted() {
  if (lsGet(K_DONE)) return;
  var ref = lsGet(K_REF);
  lsSet(K_DONE, '1');
  if (!ref || !COMP.enabled || !COMP.api) return;
  post('/comp/refer', { ref: ref, visit: 1 })
    .then(function () { compTrack('comp_referral_converted', { ref: ref }); })
    .catch(function () { /* server is authoritative; a lost beacon is not fatal */ });
}

function post(path, body) {
  return fetch(COMP.api.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (data) {
      if (!r.ok) throw Object.assign(new Error('request failed'), { status: r.status, data: data });
      return data;
    });
  });
}

function shareUrlFor(code) {
  return COMP.shareBase + '?ref=' + encodeURIComponent(code);
}

/* ── STYLES ──
   Injected rather than shipped as a stylesheet so the module stays one file and
   one request, matching consent.js. */
function ensureStyles() {
  if (document.getElementById('bkCompStyles')) return;
  var s = document.createElement('style');
  s.id = 'bkCompStyles';
  s.textContent = [
    '#bkCompOverlay{position:fixed;inset:0;z-index:9998;background:rgba(3,10,6,.72);',
    'backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}',
    '#bkCompOverlay[hidden]{display:none;}',
    '#bkCompModal{position:relative;width:100%;max-width:440px;background:#0d1711;color:#edeae0;',
    'border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:24px;',
    'font-family:Inter,system-ui,-apple-system,sans-serif;box-shadow:0 24px 64px rgba(0,0,0,.5);',
    'max-height:calc(100vh - 32px);overflow-y:auto;}',
    '#bkCompModal h2{font-size:1.25rem;font-weight:800;margin:0 0 8px;line-height:1.25;}',
    '#bkCompModal p{font-size:.9rem;line-height:1.5;color:#b9c9be;margin:0 0 14px;}',
    '#bkCompModal label{display:block;font-size:.8rem;font-weight:600;margin:0 0 6px;}',
    '#bkCompModal input[type=email],#bkCompModal input[type=text]{width:100%;padding:11px 12px;',
    'border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);',
    'color:#edeae0;font-size:.9rem;font-family:inherit;}',
    '#bkCompModal input[type=email]:focus,#bkCompModal input[type=text]:focus{outline:2px solid #2cb94e;outline-offset:1px;}',
    '#bkCompModal .bk-check{display:flex;gap:9px;align-items:flex-start;margin:12px 0 16px;font-size:.8rem;color:#b9c9be;}',
    '#bkCompModal .bk-check input{margin-top:2px;flex:0 0 auto;width:16px;height:16px;}',
    '#bkCompModal .bk-actions{display:flex;gap:8px;flex-wrap:wrap;}',
    '#bkCompModal button{font:inherit;font-weight:700;font-size:.875rem;border-radius:10px;',
    'padding:11px 16px;cursor:pointer;border:1px solid transparent;min-height:44px;}',
    '#bkCompModal .bk-primary{background:linear-gradient(135deg,#2cb94e,#12b380);color:#052411;flex:1 1 auto;}',
    '#bkCompModal .bk-ghost{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);color:#edeae0;}',
    '#bkCompModal .bk-close{position:absolute;top:10px;right:10px;background:none;border:none;',
    'color:#7a9082;font-size:1.4rem;line-height:1;padding:8px;min-height:auto;cursor:pointer;}',
    '#bkCompModal .bk-close:hover{color:#edeae0;}',
    '#bkCompModal .bk-fine{font-size:.72rem;color:#7a9082;margin:14px 0 0;line-height:1.45;}',
    '#bkCompModal .bk-fine a{color:#2cb94e;text-decoration:underline;}',
    '#bkCompModal .bk-err{color:#ff8b7a;font-size:.8rem;margin:10px 0 0;}',
    '#bkCompModal .bk-linkrow{display:flex;gap:8px;margin:0 0 14px;}',
    '#bkCompModal .bk-linkrow input{flex:1 1 auto;}',
    '#bkCompModal .bk-count{font-size:2rem;font-weight:900;color:#2cb94e;line-height:1;margin:0 0 4px;}',
    '@media (prefers-reduced-motion:no-preference){#bkCompModal{animation:bkCompIn .18s ease-out;}}',
    '@keyframes bkCompIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}'
  ].join('');
  document.head.appendChild(s);
}

/* ── MODAL ── */
var lastFocused = null;

function closeModal() {
  var o = document.getElementById('bkCompOverlay');
  if (o) o.hidden = true;
  document.removeEventListener('keydown', onKeydown, true);
  if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
}

function snoozeAndClose() {
  lsSet(K_SNOOZE, String(Date.now() + COMP.snoozeDays * 864e5));
  compTrack('comp_modal_dismissed');
  closeModal();
}

function onKeydown(e) {
  if (e.key === 'Escape') { e.stopPropagation(); snoozeAndClose(); return; }
  if (e.key !== 'Tab') return;
  /* Focus trap: a modal that lets you tab into the page behind it is
     unusable with a screen reader. */
  var modal = document.getElementById('bkCompModal');
  if (!modal) return;
  var f = modal.querySelectorAll('button,input,a[href]');
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function ensureOverlay() {
  var o = document.getElementById('bkCompOverlay');
  if (o) return o;
  ensureStyles();
  o = document.createElement('div');
  o.id = 'bkCompOverlay';
  o.hidden = true;
  o.innerHTML = '<div id="bkCompModal" role="dialog" aria-modal="true" aria-labelledby="bkCompTitle"></div>';
  o.addEventListener('click', function (e) { if (e.target === o) snoozeAndClose(); });
  document.body.appendChild(o);
  return o;
}

function closesLine() {
  if (!COMP.closesISO) return '';
  var d = new Date(COMP.closesISO);
  if (isNaN(d)) return '';
  return 'Entries close ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '. ';
}

function renderEntryForm(modal) {
  modal.innerHTML =
    '<button class="bk-close" type="button" aria-label="Close">&times;</button>' +
    '<h2 id="bkCompTitle">Win ' + escapeHtml(COMP.prize) + '</h2>' +
    '<p>Share Gaffa with your mates. Every friend who plays a full season using your link is one entry into the draw.</p>' +
    '<label for="bkCompEmail">Your email</label>' +
    '<input type="email" id="bkCompEmail" autocomplete="email" placeholder="you@example.com" required>' +
    '<div class="bk-check">' +
      '<input type="checkbox" id="bkCompAge">' +
      '<label for="bkCompAge" style="font-weight:400;margin:0">I am ' + COMP.minAge + ' or over and accept the ' +
      '<a href="' + COMP.termsUrl + '" target="_blank" rel="noopener" style="color:#2cb94e">terms</a>.</label>' +
    '</div>' +
    '<div class="bk-actions">' +
      '<button type="button" class="bk-primary" id="bkCompSubmit">Get my link</button>' +
      '<button type="button" class="bk-ghost" id="bkCompLater">Not now</button>' +
    '</div>' +
    '<p class="bk-err" id="bkCompErr" hidden></p>' +
    '<p class="bk-fine">' + closesLine() + 'We use your email only to contact you if you win, and delete it when the draw closes. ' +
    'No marketing. See the <a href="' + COMP.termsUrl + '" target="_blank" rel="noopener">full terms</a>.</p>';

  modal.querySelector('.bk-close').addEventListener('click', snoozeAndClose);
  modal.querySelector('#bkCompLater').addEventListener('click', snoozeAndClose);
  modal.querySelector('#bkCompSubmit').addEventListener('click', submitEntry);
  modal.querySelector('#bkCompEmail').focus();
}

function submitEntry() {
  var emailEl = document.getElementById('bkCompEmail');
  var ageEl = document.getElementById('bkCompAge');
  var errEl = document.getElementById('bkCompErr');
  var btn = document.getElementById('bkCompSubmit');
  var email = (emailEl.value || '').trim();

  function fail(msg) { errEl.textContent = msg; errEl.hidden = false; }
  errEl.hidden = true;

  /* Deliberately loose — the only real proof an address works is a confirmation
     email, which the server sends. This just catches obvious typos. */
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { fail('That email address does not look right.'); emailEl.focus(); return; }
  if (!ageEl.checked) { fail('Please confirm your age and accept the terms.'); ageEl.focus(); return; }
  if (!COMP.api) { fail('Entries are not open yet — check back shortly.'); return; }

  btn.disabled = true;
  btn.textContent = 'Getting your link…';
  post('/comp/enter', { email: email, ageConfirmed: true })
    .then(function (data) {
      if (!data.code) throw new Error('no code returned');
      lsSet(K_CODE, data.code);
      compTrack('comp_entered');
      renderShareState(document.getElementById('bkCompModal'), data.code, data.entries || 0);
    })
    .catch(function (err) {
      btn.disabled = false;
      btn.textContent = 'Get my link';
      if (err && err.data && err.data.error === 'duplicate') fail('That email is already entered — check your inbox for your link.');
      else fail('Could not enter you just now. Please try again in a moment.');
    });
}

function renderShareState(modal, code, entries) {
  var url = shareUrlFor(code);
  modal.innerHTML =
    '<button class="bk-close" type="button" aria-label="Close">&times;</button>' +
    '<h2 id="bkCompTitle">You are in</h2>' +
    '<p class="bk-count">' + entries + '</p>' +
    '<p>' + (entries === 1 ? 'entry so far' : 'entries so far') +
    ' — one for every friend who plays a full season on your link.</p>' +
    '<label for="bkCompLink">Your link</label>' +
    '<div class="bk-linkrow">' +
      '<input type="text" id="bkCompLink" readonly value="' + escapeHtml(url) + '">' +
      '<button type="button" class="bk-ghost" id="bkCompCopy">Copy</button>' +
    '</div>' +
    '<div class="bk-actions">' +
      '<button type="button" class="bk-primary" id="bkCompShare">Share it</button>' +
      '<button type="button" class="bk-ghost" id="bkCompDone">Done</button>' +
    '</div>' +
    '<p class="bk-fine">' + closesLine() + 'Bookmark this — you can reopen it any time from the footer.</p>';

  modal.querySelector('.bk-close').addEventListener('click', closeModal);
  modal.querySelector('#bkCompDone').addEventListener('click', closeModal);
  modal.querySelector('#bkCompCopy').addEventListener('click', function () {
    var btnc = this;
    copyText(url).then(function () {
      btnc.textContent = 'Copied';
      setTimeout(function () { btnc.textContent = 'Copy'; }, 1800);
      compTrack('comp_link_copied');
    });
  });

  var shareBtn = modal.querySelector('#bkCompShare');
  shareBtn.addEventListener('click', function () {
    var payload = {
      title: 'Gaffa — free browser football manager',
      text: 'Manage a real club for a full season, free, no sign up. Play a season on my link:',
      url: url
    };
    /* navigator.share only exists on mobile and in secure contexts; falling
       back to copy means the button always does something useful. */
    if (navigator.share) {
      navigator.share(payload)
        .then(function () { compTrack('comp_shared_native'); })
        .catch(function () { /* user cancelled — not an error */ });
    } else {
      copyText(url).then(function () {
        shareBtn.textContent = 'Link copied';
        setTimeout(function () { shareBtn.textContent = 'Share it'; }, 1800);
        compTrack('comp_link_copied');
      });
    }
  });

  modal.querySelector('#bkCompCopy').focus();
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise(function (resolve) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    resolve();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* Public entry point — also wired to a footer link so someone who dismissed the
   popup, or who already entered, can get back to their link. */
function openModal() {
  if (!COMP.enabled) return;
  lastFocused = document.activeElement;
  var overlay = ensureOverlay();
  var modal = document.getElementById('bkCompModal');
  overlay.hidden = false;
  document.addEventListener('keydown', onKeydown, true);

  var code = lsGet(K_CODE);
  if (code) {
    /* Already entered — show their link immediately with a cached count of 0,
       then correct it from the server, which is the only place the real
       number lives. */
    renderShareState(modal, code, 0);
    if (COMP.api) {
      fetch(COMP.api.replace(/\/$/, '') + '/comp/status?code=' + encodeURIComponent(code))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (typeof d.entries === 'number' && !overlay.hidden) renderShareState(modal, code, d.entries);
        })
        .catch(function () {});
    }
  } else {
    renderEntryForm(modal);
  }
  compTrack('comp_modal_opened');
}

/* ── AUTO-SHOW ──
   Gated hard. An interstitial that fires on arrival costs more in bounced
   visitors than it ever wins back in entries. */
function maybeAutoShow() {
  if (!COMP.enabled) return;
  if (lsGet(K_CODE)) return;                              // already entered

  var snooze = parseInt(lsGet(K_SNOOZE) || '0', 10);
  if (snooze && Date.now() < snooze) return;

  var views = parseInt(lsGet(K_VIEWS) || '0', 10) + 1;
  lsSet(K_VIEWS, String(views));
  if (views < COMP.minPageviews) return;

  /* Never stack on top of the cookie banner — two modals at once reads as a
     broken site, and the consent choice has to come first anyway. */
  var banner = document.getElementById('consentBanner');
  if (banner && !banner.classList.contains('hidden')) return;

  setTimeout(function () {
    var b = document.getElementById('consentBanner');
    if (b && !b.classList.contains('hidden')) return;
    if (document.getElementById('bkCompOverlay') && !document.getElementById('bkCompOverlay').hidden) return;
    openModal();
  }, COMP.showAfterMs);
}

window.BKComp = {
  open: openModal,
  markConverted: markConverted,
  shareUrl: function () { var c = lsGet(K_CODE); return c ? shareUrlFor(c) : null; },
  config: COMP
};

function bkCompBoot() {
  captureInboundRef();   // always — independent of whether the promo is live
  /* The footer link ships hidden so a disabled promotion leaves no dead link;
     it only appears once the promo is actually switched on. */
  var trigger = document.getElementById('compEntryLink');
  if (trigger && COMP.enabled) {
    /* Both, deliberately: .foot-links a sets display:flex, which outranks the
       UA stylesheet's [hidden]{display:none}, so the attribute alone would not
       hide it. The attribute still earns its place by keeping the link out of
       the accessibility tree while the promotion is off. */
    trigger.hidden = false;
    trigger.style.display = '';
    trigger.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
  }
  maybeAutoShow();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bkCompBoot);
} else {
  bkCompBoot();
}
