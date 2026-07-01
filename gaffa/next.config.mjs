/** @type {import('next').NextConfig} */
// Static export so the game can be hosted with no server (Netlify publishes the
// repo root). NEXT_PUBLIC_BASE_PATH is set at build time (e.g. "/perfect-cup").
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

const nextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
