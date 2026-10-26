// Must stay the first import: it loads `.env`, and ES module imports are evaluated
// before any statement in this file, so a loadDotenv() call in the config body would
// run after every module below had already read process.env.
import { BASE_URL, envReadiness } from './automation/utils/env';
import { defineConfig, devices } from '@playwright/test';
import { RUN_STAMP, FEATURE, BROWSER_TAG } from './automation/utils/student';

/**
 * Playwright configuration for the EShop end-to-end suite.
 *
 * Report layout is driven by two env vars so that the 9 required runs
 * (3 features x 3 browsers) each land in their own folder:
 *
 *   FEATURE=fr01 BROWSER=chromium npx playwright test automation/tests/fr01_account_registration --project=chromium
 *     -> playwright-report/fr01/chromium/index.html
 */

const reportFolder = `playwright-report/${FEATURE}/${BROWSER_TAG}`;

export default defineConfig({
  testDir: './automation/tests',
  outputDir: './test-results',
  globalSetup: './automation/global-setup.ts',
  globalTeardown: './automation/global-teardown.ts',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  metadata: {
    'Feature under test': FEATURE,
    'Browser': BROWSER_TAG,
    'Run started (ISO)': RUN_STAMP,
    'SUT': 'EShop (https://github.com/ttbhanh/eshop-sut)',
    // Booleans only. Proves .env was actually loaded for this run - the gap that
    // blocked FR-11 - without putting a credential into attributable evidence.
    ...envReadiness(),
  },

  reporter: [
    ['list'],
    ['html', {
      open: 'never',
      outputFolder: reportFolder,
      title: `EShop E2E - ${FEATURE.toUpperCase()} - ${BROWSER_TAG} - ${RUN_STAMP}`,
    }],
    ['json', { outputFile: `playwright-report/json/${FEATURE}-${BROWSER_TAG}.json` }],
  ],

  use: {
    // The web front-end is the Vite dev server on 5173; :3000 is the backend API
    // (frontend-web posts to http://localhost:3000/api/...), so it must not be the
    // baseURL for page.goto(). Verified against the running SUT.
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
