/**
 * POST /api/subscribe -> { ok: true }
 *
 * The mailing list behind the homepage's "Team talk" form. Deliberately the
 * smallest thing that works: an address, where it was typed, and a timestamp.
 * No name, no preferences, no profile — the privacy policy's position is that
 * this site collects as little as it can get away with, and a newsletter does
 * not need more than a mailbox.
 *
 * Shares `_lib/comp.mjs` rather than reimplementing Supabase access, rate
 * limiting and email normalisation. It reuses that module's `configured()`
 * gate too, so the endpoint answers 503 "not_configured" until SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, COMP_HASH_SALT and COMP_ENABLED=1 are all set —
 * the form then says the list is not open yet rather than pretending someone
 * was signed up. Nothing here ships switched on.
 *
 * Returning ok for an address already on the list is deliberate, and matters
 * more than it looks: replying "you are already subscribed" turns the form
 * into an oracle that tells any stranger whether a given person reads this
 * newsletter. Same answer either way.
 */
import {
  configured, notConfigured, json, sb, normaliseEmail,
  hashId, clientIp, tooManyRecent, readBody, methodGuard,
} from '../_lib/comp.mjs';

/** Where on the site the address was typed. Recorded so a future post can be
 *  told which page earns subscribers; anything unrecognised is dropped rather
 *  than stored, since it arrives from the client. */
const SOURCES = new Set(['home', 'guides', 'game', 'free-games']);

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!configured()) return notConfigured(res);

  const body = await readBody(req);

  const email = normaliseEmail(body.email);
  if (!email) return json(res, 400, { error: 'invalid_email' });

  /* Consent is explicit and recorded, because "we emailed you because you
     played our game" is not a lawful basis and a checkbox nobody ticked is
     not consent. The client renders this unticked. */
  if (body.consent !== true) return json(res, 400, { error: 'consent_required' });

  const source = SOURCES.has(body.source) ? body.source : 'unknown';

  /* Per-visitor ceiling, on a hash rather than the address itself: someone
     walking a list of other people's addresses through this form is the case
     worth stopping, and rate limiting on the submitted email would not see it
     because every submission carries a different one. */
  const visitor = hashId(clientIp(req));
  if (await tooManyRecent('newsletter_subscribers', 'visitor_hash', visitor, 60, 5)) {
    return json(res, 429, { error: 'too_many_requests' });
  }

  try {
    await sb('newsletter_subscribers', {
      method: 'POST',
      /* merge-duplicates so a repeat signup updates the row rather than
         failing on the unique index — see the "same answer either way" note
         above. */
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        email,
        source,
        visitor_hash: visitor,
        consent_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    /* The address is not echoed into the log; the point of the row is that it
       is in the database, and a failed insert is an operational problem
       rather than a reason to write the address somewhere less protected. */
    console.error('subscribe: insert failed', err && err.message);
    return json(res, 500, { error: 'store_failed' });
  }

  return json(res, 200, { ok: true });
}
