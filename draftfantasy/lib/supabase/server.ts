import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client used by Route Handlers.
 *
 * This app has no user auth — the only writable table (`runs`) is keyed by an
 * anonymous_id and protected by permissive RLS policies — so we use the
 * publishable (anon) key directly without a cookie/session adapter. Sessions
 * are disabled because there is nothing to persist on the server.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
