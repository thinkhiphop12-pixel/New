// Next.js inlines `process.env.NEXT_PUBLIC_*` reads at build time via static
// analysis, so this must stay a direct member expression (not destructured,
// not passed through a function) for the inlining to work.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Prefix `path` with BASE_PATH. `path` should start with a leading slash. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
