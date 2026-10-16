import type { NextConfig } from 'next';

// Set by the deploy workflow from actions/configure-pages: "/paul.emini.com" while the
// site is served from laptopmini.github.io, "" once the custom domain is configured.
const basePath = process.env.PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
