import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
/** e2e talks to the Worker running the scripted mock model, on its own port. */
const AGENT_PORT = 8799;

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter worker dev:e2e',
      url: `http://localhost:${AGENT_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // e2e builds include dev-only routes (/dev/cards); the deploy build never does.
      command: `INCLUDE_DEV_ROUTES=1 NEXT_PUBLIC_AGENT_URL=http://localhost:${AGENT_PORT}/api/copilotkit pnpm build && pnpm exec serve out -l ${PORT} --no-clipboard`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
