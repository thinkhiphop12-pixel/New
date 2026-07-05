/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Game can run fully static on GitHub Pages, but Vercel/production deployments
  // need server support for API routes (email capture, event tracking)
  // output: 'export' is NOT used to allow API routes
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
