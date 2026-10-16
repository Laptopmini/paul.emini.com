import type { NextConfig } from 'next';

// Set by the deploy workflow from actions/configure-pages: "/paul.emini.com" while the
// site is served from laptopmini.github.io, "" once the custom domain is configured.
const basePath = process.env.PAGES_BASE_PATH ?? '';

// Dev-only routes (e.g. /dev/cards) are named page.dev.tsx. They exist in `next dev`
// and in e2e builds (INCLUDE_DEV_ROUTES=1), never in the production export.
const includeDevRoutes =
  process.env.NODE_ENV !== 'production' || process.env.INCLUDE_DEV_ROUTES === '1';

const nextConfig: NextConfig = {
  output: 'export',
  pageExtensions: includeDevRoutes ? ['dev.tsx', 'tsx', 'ts'] : ['tsx', 'ts'],
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
