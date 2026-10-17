import type { NextConfig } from 'next';

// Set by the deploy workflow from actions/configure-pages: "/paul.emini.com" while the
// site is served from laptopmini.github.io, "" once the custom domain is configured.
const basePath = process.env.PAGES_BASE_PATH ?? '';

// Dev-only routes (e.g. /dev/cards) are named page.dev.tsx. They exist in `next dev`
// and in e2e builds (INCLUDE_DEV_ROUTES=1), never in the production export.
const includeDevRoutes =
  process.env.NODE_ENV !== 'production' || process.env.INCLUDE_DEV_ROUTES === '1';

/** CopilotKit chat UI packages the headless chat never runs (scripts/unused-module.cjs). */
const UNUSED_CHAT_UI = [
  'streamdown',
  'react-markdown',
  'katex',
  'katex/dist/katex.min.css',
  '@copilotkit/a2ui-renderer',
  '@copilotkit/mcp-apps-renderer',
  '@copilotkit/mcp-apps-renderer/activity',
  '@copilotkit/web-components/threads-drawer',
  '@copilotkit/web-inspector',
  '@jetbrains/websandbox',
  '@copilotkit/react-ui',
  '@copilotkit/runtime-client-gql',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-slot',
  '@tanstack/react-virtual',
  'lucide-react',
  'use-stick-to-bottom',
  'phoenix',
];

const nextConfig: NextConfig = {
  output: 'export',
  pageExtensions: includeDevRoutes ? ['dev.tsx', 'tsx', 'ts'] : ['tsx', 'ts'],
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // The landing page's CSS is small: inline it rather than block first paint on four requests.
  experimental: { inlineCss: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    rules: { '*.md': { loaders: ['./scripts/text-loader.cjs'], as: '*.js' } },
    resolveAlias: Object.fromEntries(UNUSED_CHAT_UI.map((m) => [m, './scripts/unused-module.cjs'])),
  },
};

export default nextConfig;
