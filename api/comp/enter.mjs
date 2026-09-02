/**
 * POST /api/comp/enter -> { code, entries }
 *
 * Two ways in, depending on COMP_REQUIRE_ACCOUNT:
 *
 *   account mode (default)  Authorization: Bearer <supabase access token>
 *                           Body: { ageConfirmed }
 *                           The address comes from the verified session, never
 *                           from the request body — a client-supplied email
 *                           would let anyone enter as anyone.
 *
 *   email mode              Body: { email, ageConfirmed }
 *                           Kept for a low-value promotion where sign-in
 *                           friction costs more than the fraud it prevents.
 *                           Entries stay unverified until a confirmation link
 *                           is followed, and the draw view excludes those.
 *
 * Returning the existing code for someone already registered — rather than an
 * error — is deliberate: a person who lost their link should get it back.
 */
import {
  cfg, configured, notConfigured, json, sb, normaliseEmail, userFromToken, bearer,
  hashId, clientIp, makeCode, tooManyRecent, readBody, methodGuard,
} from '../_lib/comp.mjs';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!configured()) return notConfigured(res);

  const conf = cfg();
  const body = await readBody(req);
  if (body.ageConfirmed !== true) return json(res, 400, { error: 'age_not_confirmed' });

  let account = null;
  let email;

  if (conf.requireAccount) {
    account = await userFromToken(bearer(req));
    if (!account) return json(res, 401, { error: 'sign_in_required' });
    email = account.email;
  } else {
    email = body.email;
  }

  const emailNorm = normaliseEmail(email);
  if (!emailNorm) return json(res, 400, { error: 'invalid_email' });

  const ipHash = hashId(clientIp(req));

  try {
    /* An account can only ever hold one entry, and so can a mailbox. Check both
       — the same person signing in with Google and later with a magic link on
       the same address is one entrant, not two. */
    const filter = account
      ? `or=(user_id.eq.${account.id},email_norm.eq.${encodeURIComponent(emailNorm)})`
      : `email_norm=eq.${encodeURIComponent(emailNorm)}`;
    const existing = await sb(`comp_entrants?select=code&${filter}&limit=1`);
    if (Array.isArray(existing) && existing.length) {
      const counts = await sb(
        `comp_entry_counts?select=entries&code=eq.${encodeURIComponent(existing[0].code)}&limit=1`,
      );
      return json(res, 200, {
        code: existing[0].code,
        entries: counts?.[0]?.entries ?? 0,
        existing: true,
      });
    }

    /* Signing up is cheap; signing up ten thousand times should not be. Less
       load-bearing in account mode, where the identity provider is the real
       barrier, but it still blunts a script with a pile of stolen sessions. */
    if (await tooManyRecent('comp_entrants', 'ip_hash', ipHash, 60, 5)) {
      return json(res, 429, { error: 'rate_limited' });
    }

    const code = makeCode();
    const created = await sb('comp_entrants', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        email: String(email).trim(),
        email_norm: emailNorm,
        code,
        age_confirmed: true,
        ip_hash: ipHash,
        user_id: account ? account.id : null,
        /* Account-backed entries are verified by construction: the identity
           provider confirmed the mailbox before a session could exist. */
        verified: account ? true : !conf.requireVerification,
      }),
    });
    const row = Array.isArray(created) ? created[0] : created;
    return json(res, 200, { code: row.code, entries: 0 });
  } catch (err) {
    /* 23505 is a unique violation — two requests raced for the same account or
       address. Both callers should end up with the same code, not an error. */
    if (err.status === 409 || err.body?.code === '23505') {
      const again = await sb(
        `comp_entrants?select=code&email_norm=eq.${encodeURIComponent(emailNorm)}&limit=1`,
      ).catch(() => null);
      if (Array.isArray(again) && again.length) {
        return json(res, 200, { code: again[0].code, entries: 0, existing: true });
      }
      return json(res, 409, { error: 'duplicate' });
    }
    console.error('comp/enter failed', err.status, err.body);
    return json(res, 500, { error: 'server_error' });
  }
}
