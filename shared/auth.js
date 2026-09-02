/* Optional accounts for BALLKNW.
 *
 * DESIGN RULE, and the reason this file is shaped the way it is: signing in is
 * an offer, never a gate. Guest play stays the default, a guest's save keeps
 * living in their own browser, and nothing here expires or deletes a local
 * save. The site's whole position — and its homepage title — is "no sign up";
 * an account has to earn its place by adding something (the same career on your
 * phone and your laptop, more than one club on the go), not by taking something
 * away from people who decline.
 *
 * Ships switched off. AUTH.enabled stays false until a Supabase project exists
 * and the privacy policy has been updated to say an email address is collected,
 * because today it states the opposite in plain terms.
 *
 * The Supabase SDK is fetched from a CDN on first use rather than loaded on
 * every page: almost nobody clicks sign in, and the guest path should not pay
 * for a library it never touches.
 */

var AUTH = {
  enabled: false,
  url: '',      // https://<project>.supabase.co
  anonKey: '',  // publishable anon key — safe in the browser, RLS does the work
  /* Google and email are free. Apple requires a paid Apple Developer account,
     so it is listed separately and stays off until that exists. */
  providers: { google: true, email: true, apple: false },
  sdk: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm',
  /* Where the OAuth redirect lands. Must be registered in Supabase's allowed
     redirect URLs or the provider refuses the round trip. */
  redirectTo: 'https://www.ballknw.com/',
};

var clientPromise = null;

function ready() {
  return Boolean(AUTH.enabled && AUTH.url && AUTH.anonKey);
}

/** Lazily import the SDK and build a client. Cached, so repeated calls during
 *  one page life share a single import and a single client. */
function client() {
  if (!ready()) return Promise.reject(new Error('auth_not_configured'));
  if (!clientPromise) {
    clientPromise = import(AUTH.sdk)
      .then(function (mod) {
        return mod.createClient(AUTH.url, AUTH.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
      })
      .catch(function (err) {
        /* Do not cache a failed import — an offline first click should not
           poison every later attempt in the same session. */
        clientPromise = null;
        throw err;
      });
  }
  return clientPromise;
}

function authTrack(event, props) {
  try { if (window.posthog) window.posthog.capture(event, props || {}); } catch (e) {}
}

/* ── SESSION ── */

function getUser() {
  if (!ready()) return Promise.resolve(null);
  return client()
    .then(function (c) { return c.auth.getUser(); })
    .then(function (r) { return (r && r.data && r.data.user) || null; })
    .catch(function () { return null; });
}

/** The current session's access token, for authenticating a call to our own
 *  API. Null when signed out or unconfigured. */
function getAccessToken() {
  if (!ready()) return Promise.resolve(null);
  return client()
    .then(function (c) { return c.auth.getSession(); })
    .then(function (r) { return (r && r.data && r.data.session && r.data.session.access_token) || null; })
    .catch(function () { return null; });
}

/** Run a callback once the auth state changes, so a modal waiting on sign-in
 *  can update itself when the user returns from an OAuth round trip. */
function onAuthChange(fn) {
  if (!ready()) return;
  client()
    .then(function (c) { c.auth.onAuthStateChange(function () { try { fn(); } catch (e) {} }); })
    .catch(function () {});
}

function signInWithGoogle() {
  return client().then(function (c) {
    authTrack('auth_signin_started', { provider: 'google' });
    return c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: AUTH.redirectTo },
    });
  });
}

function signInWithApple() {
  return client().then(function (c) {
    authTrack('auth_signin_started', { provider: 'apple' });
    return c.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: AUTH.redirectTo },
    });
  });
}

/** Magic link: no password to choose, forget or leak. */
function signInWithEmail(email) {
  return client().then(function (c) {
    authTrack('auth_signin_started', { provider: 'email' });
    return c.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: AUTH.redirectTo },
    });
  });
}

function signOut() {
  return client()
    .then(function (c) { return c.auth.signOut(); })
    .then(function () { authTrack('auth_signed_out'); });
}

/* ── CLOUD SAVES ──
 * A convenience wrapper over the game_saves table. Row-level security fences
 * every row to its owner, so a stolen or guessed user id buys nothing.
 * Deliberately additive: pushing a save to the cloud never clears the local
 * copy, so signing out — or the sync failing — always leaves the player with
 * the career they had. */

function pushSave(payload, meta) {
  if (!ready()) return Promise.resolve(null);
  return Promise.all([client(), getUser()]).then(function (r) {
    var c = r[0], user = r[1];
    if (!user) return null;
    return c
      .from('game_saves')
      .upsert(
        {
          user_id: user.id,
          slot: (meta && meta.slot) || 1,
          payload: payload,
          club_name: (meta && meta.clubName) || null,
          season_year: (meta && meta.seasonYear) || null,
        },
        { onConflict: 'user_id,slot' },
      )
      .select()
      .then(function (res) {
        if (res.error) throw res.error;
        authTrack('cloud_save_pushed');
        return res.data && res.data[0];
      });
  });
}

function pullSave(slot) {
  if (!ready()) return Promise.resolve(null);
  return Promise.all([client(), getUser()]).then(function (r) {
    var c = r[0], user = r[1];
    if (!user) return null;
    return c
      .from('game_saves')
      .select('payload, club_name, season_year, updated_at, slot')
      .eq('user_id', user.id)
      .eq('slot', slot || 1)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || null;
      });
  });
}

function listSaves() {
  if (!ready()) return Promise.resolve([]);
  return Promise.all([client(), getUser()]).then(function (r) {
    var c = r[0], user = r[1];
    if (!user) return [];
    /* Deliberately omits `payload`: the slot picker needs labels, not several
       hundred kilobytes of game state per row. */
    return c
      .from('game_saves')
      .select('slot, club_name, season_year, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  });
}

/* ── SIGN-IN UI ──
 * Styles are injected rather than shipped as a stylesheet, matching consent.js
 * and comp.js, so the module stays one file and one request. */

function ensureStyles() {
  if (document.getElementById('bkAuthStyles')) return;
  var s = document.createElement('style');
  s.id = 'bkAuthStyles';
  s.textContent = [
    '#bkAuthOverlay{position:fixed;inset:0;z-index:9997;background:rgba(3,10,6,.72);',
    'backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}',
    '#bkAuthOverlay[hidden]{display:none;}',
    '#bkAuthModal{position:relative;width:100%;max-width:400px;background:#0d1711;color:#edeae0;',
    'border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:24px;',
    'font-family:Inter,system-ui,-apple-system,sans-serif;box-shadow:0 24px 64px rgba(0,0,0,.5);}',
    '#bkAuthModal h2{font-size:1.2rem;font-weight:800;margin:0 0 8px;}',
    '#bkAuthModal p{font-size:.88rem;line-height:1.5;color:#b9c9be;margin:0 0 16px;}',
    '#bkAuthModal button{font:inherit;font-weight:700;font-size:.875rem;border-radius:10px;',
    'padding:11px 16px;cursor:pointer;border:1px solid transparent;min-height:44px;width:100%;margin-bottom:8px;}',
    '#bkAuthModal .bk-oauth{background:#fff;color:#1a1a1a;display:flex;align-items:center;justify-content:center;gap:8px;}',
    '#bkAuthModal .bk-apple{background:#000;color:#fff;}',
    '#bkAuthModal .bk-primary{background:linear-gradient(135deg,#2cb94e,#12b380);color:#052411;}',
    '#bkAuthModal input{width:100%;padding:11px 12px;border-radius:10px;margin-bottom:8px;',
    'border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#edeae0;font:inherit;font-size:.9rem;}',
    '#bkAuthModal input:focus{outline:2px solid #2cb94e;outline-offset:1px;}',
    '#bkAuthModal .bk-or{text-align:center;font-size:.72rem;color:#7a9082;margin:12px 0;letter-spacing:.08em;}',
    '#bkAuthModal .bk-close{position:absolute;top:10px;right:10px;background:none;border:none;color:#7a9082;',
    'font-size:1.4rem;line-height:1;padding:8px;min-height:auto;width:auto;cursor:pointer;margin:0;}',
    '#bkAuthModal .bk-fine{font-size:.72rem;color:#7a9082;margin:12px 0 0;line-height:1.45;}',
    '#bkAuthModal .bk-fine a{color:#2cb94e;}',
    '#bkAuthModal .bk-msg{font-size:.82rem;margin:10px 0 0;}',
    '#bkAuthModal .bk-msg--err{color:#ff8b7a;}',
    '#bkAuthModal .bk-msg--ok{color:#2cb94e;}',
  ].join('');
  document.head.appendChild(s);
}

var lastFocused = null;

function closeModal() {
  var o = document.getElementById('bkAuthOverlay');
  if (o) o.hidden = true;
  document.removeEventListener('keydown', onKeydown, true);
  if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
}

function onKeydown(e) {
  if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
  if (e.key !== 'Tab') return;
  var modal = document.getElementById('bkAuthModal');
  if (!modal) return;
  var f = modal.querySelectorAll('button,input,a[href]');
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function openSignIn() {
  if (!ready()) return;
  lastFocused = document.activeElement;
  ensureStyles();

  var overlay = document.getElementById('bkAuthOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'bkAuthOverlay';
    overlay.innerHTML = '<div id="bkAuthModal" role="dialog" aria-modal="true" aria-labelledby="bkAuthTitle"></div>';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }
  overlay.hidden = false;
  document.addEventListener('keydown', onKeydown, true);

  var modal = document.getElementById('bkAuthModal');
  modal.innerHTML =
    '<button class="bk-close" type="button" aria-label="Close">&times;</button>' +
    '<h2 id="bkAuthTitle">Keep your save anywhere</h2>' +
    '<p>Sign in and your career follows you between your phone and your laptop, ' +
    'and you can run more than one club at once. You do not need an account to play — ' +
    'this only adds to what you already have.</p>' +
    (AUTH.providers.google
      ? '<button class="bk-oauth" id="bkAuthGoogle" type="button">Continue with Google</button>'
      : '') +
    (AUTH.providers.apple
      ? '<button class="bk-apple" id="bkAuthApple" type="button">Continue with Apple</button>'
      : '') +
    (AUTH.providers.email
      ? '<div class="bk-or">OR</div>' +
        '<input type="email" id="bkAuthEmail" placeholder="you@example.com" autocomplete="email">' +
        '<button class="bk-primary" id="bkAuthEmailBtn" type="button">Email me a link</button>'
      : '') +
    '<p class="bk-msg" id="bkAuthMsg" hidden></p>' +
    '<p class="bk-fine">We store your email address and your saves, nothing else. ' +
    'See our <a href="/privacy.html">privacy policy</a>.</p>';

  var msg = modal.querySelector('#bkAuthMsg');
  function say(text, kind) {
    msg.textContent = text;
    msg.className = 'bk-msg bk-msg--' + kind;
    msg.hidden = false;
  }

  modal.querySelector('.bk-close').addEventListener('click', closeModal);

  var g = modal.querySelector('#bkAuthGoogle');
  if (g) g.addEventListener('click', function () {
    signInWithGoogle().catch(function () { say('Could not start sign-in. Please try again.', 'err'); });
  });

  var ap = modal.querySelector('#bkAuthApple');
  if (ap) ap.addEventListener('click', function () {
    signInWithApple().catch(function () { say('Could not start sign-in. Please try again.', 'err'); });
  });

  var eb = modal.querySelector('#bkAuthEmailBtn');
  if (eb) eb.addEventListener('click', function () {
    var email = (modal.querySelector('#bkAuthEmail').value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('That email address does not look right.', 'err'); return; }
    eb.disabled = true;
    eb.textContent = 'Sending…';
    signInWithEmail(email)
      .then(function (r) {
        if (r && r.error) throw r.error;
        say('Check your inbox for the sign-in link.', 'ok');
      })
      .catch(function () {
        eb.disabled = false;
        eb.textContent = 'Email me a link';
        say('Could not send the link. Please try again.', 'err');
      });
  });

  var focusTarget = modal.querySelector('button:not(.bk-close)');
  if (focusTarget) focusTarget.focus();
  authTrack('auth_modal_opened');
}

window.BKAuth = {
  open: openSignIn,
  getAccessToken: getAccessToken,
  onAuthChange: onAuthChange,
  close: closeModal,
  isEnabled: ready,
  getUser: getUser,
  signOut: signOut,
  pushSave: pushSave,
  pullSave: pullSave,
  listSaves: listSaves,
  config: AUTH,
};

function bkAuthBoot() {
  /* Same reveal rule as the prize-draw link: the trigger ships hidden and with
     an inline display:none, because .foot-links a sets display:flex, which
     outranks the user-agent [hidden] rule and would leave a dead link visible
     while accounts are switched off. */
  var trigger = document.getElementById('authSignInLink');
  if (trigger && ready()) {
    trigger.hidden = false;
    trigger.style.display = '';
    trigger.addEventListener('click', function (e) { e.preventDefault(); openSignIn(); });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bkAuthBoot);
} else {
  bkAuthBoot();
}
