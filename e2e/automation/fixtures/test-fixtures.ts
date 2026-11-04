import { test as base, expect } from '@playwright/test';
import { RUN_STAMP } from '../utils/student';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ADMIN_EMAIL, USER_EMAIL, SUT_JWT_SECRET } from '../utils/env';
import * as api from '../utils/eshop-api';
import { loadJson } from '../utils/data-loader';

interface KnownFailure {
  bug: string;
  kind: 'bug' | 'clarification';
  issue: string;
}

/** tc_id -> the open SUT defect that makes the case fail. See the file's `_meta`. */
const KNOWN_FAILURES = loadJson<{ cases: Record<string, KnownFailure> }>(
  'known_failures.json',
).cases;

/**
 * Shared fixtures for the whole suite.
 *
 * Import `test` from here, never from '@playwright/test' directly - that is what
 * guarantees the run annotation lands on every single test in the HTML report.
 */

type Pages = {
  registerPage: RegisterPage;
  loginPage: LoginPage;
  orderHistoryPage: OrderHistoryPage;
  adminDashboardPage: AdminDashboardPage;
  knownFailure: void;
};

type WorkerAuth = {
  /** Signed setup tokens avoid coupling functional rows to the SUT-wide request cap. */
  adminToken: string;
  userToken: string;
};

export const test = base.extend<Pages, WorkerAuth>({
  // Runs before every test: stamp the run start onto the test's report entry.
  page: async ({ page }, use, testInfo) => {
    testInfo.annotations.push({ type: 'Run started', description: RUN_STAMP });
    await use(page);
  },

  registerPage: async ({ page }, use) => { await use(new RegisterPage(page)); },
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  orderHistoryPage: async ({ page }, use) => { await use(new OrderHistoryPage(page)); },
  adminDashboardPage: async ({ page }, use) => { await use(new AdminDashboardPage(page)); },

  // Runs before every test: a case listed in known_failures.json is expected to fail.
  // It stays green while its defect is open, and Playwright reports it as an
  // unexpected pass - a red run - once the defect is fixed and the entry is stale.
  knownFailure: [async ({}, use, testInfo) => {
    const tcId = testInfo.title.split(' ')[0];
    const known = KNOWN_FAILURES[tcId];
    if (known) {
      testInfo.annotations.push({ type: 'Known defect', description: `${known.bug} ${known.issue}` });
      testInfo.fail(true, `${known.bug} (${known.kind})`);
    }
    await use();
  }, { auto: true }],

  adminToken: [async ({}, use) => {
    if (!SUT_JWT_SECRET) {
      throw new Error('adminToken fixture needs SUT_JWT_SECRET in .env');
    }
    await use(api.mintToken(SUT_JWT_SECRET, {
      id: 1,
      email: ADMIN_EMAIL,
      role: 'admin',
    }));
  }, { scope: 'worker' }],

  userToken: [async ({}, use) => {
    if (!SUT_JWT_SECRET) {
      throw new Error('userToken fixture needs SUT_JWT_SECRET in .env');
    }
    await use(api.mintToken(SUT_JWT_SECRET, {
      id: 2,
      email: USER_EMAIL,
      role: 'user',
    }));
  }, { scope: 'worker' }],
});

export { expect };
