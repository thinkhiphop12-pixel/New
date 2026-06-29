import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Uses the publishable (anon) key, which is safe
 * to ship to the browser — Row Level Security governs what it can read/write.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
