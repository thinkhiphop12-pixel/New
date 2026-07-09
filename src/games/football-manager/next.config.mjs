/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Game can run fully static on GitHub Pages, but Vercel/production deployments
  // need server support for API routes (email capture, event tracking), so
  // 'export' is opt-in via STATIC_EXPORT=1 for the GitHub Pages build only.
  output: process.env.STATIC_EXPORT === '1' ? 'export' : undefined,
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  typescript: {
    // Allow TypeScript errors during build if needed (dev fallback)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
