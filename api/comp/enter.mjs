/**
 * POST /api/comp/enter  { email, ageConfirmed } -> { code, entries }
 *
 * Creates an entrant and returns their referral code. Returning the existing
 * code for an address already registered — rather than erroring — is
 * deliberate: someone who lost their link should get it back, not be told they
 * are a duplicate and left with nothing.
 */
import {
  cfg, configured, notConfigured, json, sb, normaliseEmail,
  hashId, clientIp, makeCode, tooManyRecent, readBody, methodGuard,
} from '../_lib/comp.mjs';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!configured()) return notConfigured(res);

  const body = await readBody(req);
  const emailNorm = normaliseEmail(body.email);
  if (!emailNorm) return json(res, 400, { error: 'invalid_email' });
  if (body.ageConfirmed !== true) return json(res, 400, { error: 'age_not_confirmed' });

  const ipHash = hashId(clientIp(req));

  try {
    /* Already entered: hand back the same code. The unique index on email_norm
       is what actually enforces one entrant per mailbox; this lookup just makes
       the common case a clean 200 instead of a conflict. */
    const existing = await sb(
      `comp_entrants?select=code&email_norm=eq.${encodeURIComponent(emailNorm)}&limit=1`,
    );
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

    /* Signing up is cheap; signing up ten thousand times should not be. */
    if (await tooManyRecent('comp_entrants', 'ip_hash', ipHash, 60, 5)) {
      return json(res, 429, { error: 'rate_limited' });
    }

    const code = makeCode();
    const created = await sb('comp_entrants', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        email: String(body.email).trim(),
        email_norm: emailNorm,
        code,
        age_confirmed: true,
        ip_hash: ipHash,
        verified: !cfg().requireVerification,
      }),
    });
    const row = Array.isArray(created) ? created[0] : created;
    return json(res, 200, { code: row.code, entries: 0 });
  } catch (err) {
    /* 23505 is a unique violation — two requests for the same address raced.
       Both callers should end up with the same code, not an error. */
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
