import { existsSync, readdirSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

/** Find the preinstalled Chromium in this environment (the bundled Playwright
 *  version may not match, so we launch the on-disk build directly). */
function findChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const dir = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
    if (!dir) return undefined;
    const candidate = `${base}/${dir}/chrome-linux/chrome`;
    return existsSync(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

const chromiumPath = findChromium();

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Launch the environment's preinstalled Chromium (full binary, not the
        // headless shell) so a version mismatch doesn't require a download.
        launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
