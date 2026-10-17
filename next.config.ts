import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep verification builds separate from the running development server.
  distDir: process.env.KOVIA_ISOLATED_BUILD === 'true' ? 'tmp/catalog-production' : '.next',
  typescript: {
    tsconfigPath:
      process.env.KOVIA_ISOLATED_BUILD === 'true' ? 'tsconfig.production.json' : 'tsconfig.json',
  },
  typedRoutes: true,
  reactStrictMode: true,
  images: {
    qualities: [75, 90],
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
