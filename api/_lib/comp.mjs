/**
 * Shared plumbing for the prize-draw endpoints.
 *
 * Talks to Supabase over its REST interface with plain fetch rather than the
 * JS SDK, so the repository root stays dependency-free — it is otherwise a
 * static site with no build step, and adding a node_modules tree to it just to
 * insert three rows is a poor trade.
 *
 * The service role key used here bypasses row-level security, which is the
 * point: the competition tables deny the anon role entirely, so entry counts
 * can only be written by this code. It must never reach the browser.
 */

import crypto from 'node:crypto';

/**
 * Read configuration on each call rather than freezing it at module load.
 * Module scope is evaluated once per warm serverless instance, so a value
 * captured there survives until the instance is recycled — which makes an
 * environment change take unpredictably long to apply, and makes the module
 * untestable without juggling import caches. Reading process.env per call
 * costs nothing at this volume.
 */
export function cfg() {
  return {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    /* Master switch, separate from whether the database is reachable. Lets the
       promotion be turned off in seconds without tearing down infrastructure. */
    enabled: process.env.COMP_ENABLED === '1',
    /* Salt for visitor hashes. Without it, hashed IPs are trivially reversible
       by anyone who can guess an address — the space is small enough to brute
       force. Generate with: openssl rand -hex 32 */
    salt: process.env.COMP_HASH_SALT || '',
    /* Entries from unverified addresses are stored but excluded from the draw.
       Flip on once confirmation emails are wired up. */
    requireVerification: process.env.COMP_REQUIRE_VERIFICATION === '1',
    /* Require a signed-in account to enter. Strongly recommended for any prize
       worth farming: it borrows the identity provider's already-verified
       mailbox instead of trusting a typed address. Playing is unaffected. */
    requireAccount: process.env.COMP_REQUIRE_ACCOUNT !== '0',
  };
}

/**
 * Exchange a Supabase access token for the account behind it.
 *
 * Verified by asking Supabase's auth service, not by decoding the JWT here: a
 * token is only trustworthy if something checked its signature and expiry
 * against the issuing project, and reimplementing that check is how people ship
 * auth bypasses. One extra request per entry is a fair price.
 *
 * Returns null for anything that does not resolve to a real, confirmed user.
 */
export async function userFromToken(token) {
  if (!token) return null;
  const c = cfg();
  try {
    const r = await fetch(`${c.url}/auth/v1/user`, {
      headers: { apikey: c.serviceKey, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u || !u.id || !u.email) return null;
    return { id: u.id, email: u.email };
  } catch {
    return null;
  }
}

/** Pull the bearer token out of the Authorization header. */
export function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h));
  return m ? m[1].trim() : null;
}

export function configured() {
  const c = cfg();
  return Boolean(c.url && c.serviceKey && c.salt && c.enabled);
}

export function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

/** Uniform "the promotion is not live" reply. The client shows "entries are
 *  not open yet" for this rather than pretending someone was entered. */
export function notConfigured(res) {
  return json(res, 503, { error: 'not_configured' });
}

export async function sb(path, options = {}) {
  const c = cfg();
  const r = await fetch(`${c.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: c.serviceKey,
      Authorization: `Bearer ${c.serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!r.ok) {
    const err = new Error(`supabase ${r.status}`);
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * Normalise an address so one mailbox cannot register as many entrants.
 * Gmail ignores dots and anything after a plus, which is the single most common
 * way these promotions get farmed; other providers do not, so the rule is
 * applied only where it is actually true.
 */
export function normaliseEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  let local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!/^[^\s@]+$/.test(local) || !/^[^\s@]+\.[^\s@]+$/.test(domain)) return null;
  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (domain === 'gmail.com' || domain === 'googlemail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

/** Salted hash of an identifier — used for IPs, which are personal data and
 *  which we have no reason to store in the clear. */
export function hashId(value) {
  const salt = cfg().salt;
  /* Refuse rather than silently hashing with an empty key: an unsalted hash of
     an IPv4 address is reversible by brute force, so it would be personal data
     wearing a disguise. configured() already blocks this path, but a hash this
     weak should never be reachable by accident. */
  if (!salt) throw new Error('COMP_HASH_SALT is not set');
  return crypto.createHmac('sha256', salt).update(String(value)).digest('hex');
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Referral codes are shown to people and typed by people, so the alphabet
 * leaves out characters that are easy to confuse: 0/O, 1/I/L. Generated from
 * crypto random bytes rather than Math.random, since a guessable code lets
 * someone credit a stranger's entries — or farm their own.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/**
 * Coarse per-IP rate limit, held in the database so it survives the serverless
 * instance being recycled — an in-memory counter would reset constantly and
 * limit nothing. Counts recent rows rather than keeping a separate bucket
 * table, which is cheap enough at this volume and has nothing to expire.
 */
export async function tooManyRecent(table, column, value, windowMinutes, max) {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const rows = await sb(
    `${table}?select=id&${column}=eq.${encodeURIComponent(value)}&created_at=gte.${encodeURIComponent(since)}&limit=${max + 1}`,
  );
  return Array.isArray(rows) && rows.length >= max;
}

/** Body parsing that tolerates both a parsed object and a raw string, since
 *  that varies with how the function is invoked. */
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export function methodGuard(req, res, allowed) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', `${allowed}, OPTIONS`);
    res.status(204).end();
    return false;
  }
  if (req.method !== allowed) {
    res.setHeader('Allow', allowed);
    json(res, 405, { error: 'method_not_allowed' });
    return false;
  }
  return true;
}
