/**
 * GET /api/comp/status?code=CODE -> { entries }
 *
 * Read-only entry count for one code, so the share panel can show a live
 * number. Returns only the count: no email, no entrant id, nothing that turns
 * a guessed code into a way of learning who entered.
 */
import { configured, notConfigured, json, sb, methodGuard } from '../_lib/comp.mjs';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  if (!configured()) return notConfigured(res);

  const url = new URL(req.url, 'http://localhost');
  const code = String(url.searchParams.get('code') || '')
    .slice(0, 64)
    .replace(/[^A-Za-z0-9_-]/g, '');
  if (!code) return json(res, 400, { error: 'invalid_code' });

  try {
    const rows = await sb(
      `comp_entry_counts?select=entries&code=eq.${encodeURIComponent(code)}&limit=1`,
    );
    /* An unknown code reports zero rather than 404: the count is the only thing
       this endpoint is for, and a distinct "no such code" answer would let
       someone enumerate valid codes. */
    return json(res, 200, { entries: rows?.[0]?.entries ?? 0 });
  } catch (err) {
    console.error('comp/status failed', err.status, err.body);
    return json(res, 500, { error: 'server_error' });
  }
}
