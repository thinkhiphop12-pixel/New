import type { NextConfig } from 'next'

/**
 * Blink Next.js (static export). The published artifact is plain HTML/CSS/JS
 * in `out/` — served by Blink hosting like the Vite template's `dist/`.
 * Keep this app frontend-only + Blink SDK; put backend logic in Blink functions.
 */
const nextConfig: NextConfig = {
  output: 'export',
  // next/image can't use the optimizer in a static export.
  images: { unoptimized: true },
  // Don't fail the sandbox build on type errors mid-edit. (Next 16 removed the
  // `eslint` config key — lint is run separately, so don't set it here.)
  typescript: { ignoreBuildErrors: true },
  // Allow the E2B/Blink preview domains to talk to the dev server (Next 16).
  allowedDevOrigins: [
    '*.e2b.dev',
    '*.e2b.app',
    '*.preview-blink.com',
    '*.sites.blink.new',
    '*.blink.new',
  ],
}

export default nextConfig
