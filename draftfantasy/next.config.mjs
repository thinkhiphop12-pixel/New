/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Fully static export so the game can be hosted on GitHub Pages (ballknw.com)
  // with no server. Persistence talks to Supabase directly from the browser.
  output: 'export',
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
