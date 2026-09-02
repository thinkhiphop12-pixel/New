/**
 * POST /api/comp/refer  { ref } -> { ok: true }
 *
 * Credits one referral to the entrant who owns `ref`. Called by the game when a
 * visitor finishes a season — a completed season, not a click, because clicks
 * are trivially farmed.
 *
 * Always answers 200 { ok: true } once the request is well-formed, whether or
 * not a row was written. The caller is a fire-and-forget beacon that must not
 * leak whether a code exists or whether this visitor already counted; either
 * would hand a farmer a free oracle.
 */
import {
  configured, notConfigured, json, sb, hashId, clientIp, readBody, methodGuard,
} from '../_lib/comp.mjs';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!configured()) return notConfigured(res);

  const body = await readBody(req);
  const ref = String(body.ref || '').slice(0, 64).replace(/[^A-Za-z0-9_-]/g, '');
  if (!ref) return json(res, 400, { error: 'invalid_ref' });

  const visitorHash = hashId(clientIp(req));

  try {
    const owner = await sb(
      `comp_entrants?select=id,ip_hash&code=eq.${encodeURIComponent(ref)}&limit=1`,
    );
    if (!Array.isArray(owner) || !owner.length) return json(res, 200, { ok: true });

    /* Self-referral: the entrant converting on their own link, usually from the
       same connection. The client checks this too, but the client is the thing
       being defended against. */
    if (owner[0].ip_hash && owner[0].ip_hash === visitorHash) {
      return json(res, 200, { ok: true });
    }

    /* The unique index on (entrant_id, visitor_hash) is the real guard — this
       insert simply fails on a repeat, which is the intended outcome. */
    await sb('comp_referrals', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ entrant_id: owner[0].id, visitor_hash: visitorHash }),
    }).catch((err) => {
      if (err.status !== 409 && err.body?.code !== '23505') throw err;
    });

    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('comp/refer failed', err.status, err.body);
    return json(res, 500, { error: 'server_error' });
  }
}
