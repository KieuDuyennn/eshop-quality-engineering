import { test, expect } from '../../fixtures/test-fixtures';
import { loadJson, caseTitle, type TestCaseRow } from '../../utils/data-loader';
import { expectStatusAmong, expectFigureMatches } from '../../utils/assertions';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
  SUT_JWT_SECRET,
} from '../../utils/env';
import * as api from '../../utils/eshop-api';
import type { OrderStatus } from '../../utils/eshop-api';

/**
 * FR-13 Dashboard, admin (Pool C) - HW04 Task 1.
 *
 * All 50 cases come from `automation/data/fr13_dashboard.json`; there is no case
 * literal in this file, and no branch keys off a `tc_id`. Everything that varies
 * between cases - which credentials are sent, what is seeded, how precisely a delta
 * is asserted - is a column in the data file, so a new case is a new row rather than
 * a new `if`. The UI is the admin app on :5174, a single-file React SPA with no
 * router, so the dashboard is the landing view and NOT `/admin/dashboard`.
 *
 * Approach: **measure, seed through the API, re-measure.** The dashboard reports
 * GLOBAL totals and the SUT database is never reset between the nine required runs,
 * so an absolute expectation ("revenue = 100", as HW02 wrote them) is unrunnable.
 * Every revenue and count case asserts the CHANGE its own seeded orders cause.
 *
 * Expected values state what the SPECIFICATION requires (README.md FR-13 L183:
 * revenue is the sum of `total_amount` over `status = 'delivered'`, no multiplier),
 * never what this build produces. A red case is a finding to triage, not an
 * assertion to soften - project rule §4.
 *
 * Assertion patterns used (the brief wants >= 3 genuinely distinct ones):
 *   1 UI state       - cards visible, dashboard reachable or not, the app's own alert
 *                      text, the login form present, the token gone after logout
 *   2 API / contract - status codes of the admin endpoints and of the self-update
 *                      endpoint, plus the shape and types of the orders payload
 *   3 data integrity - the rendered KPI recomputed from the payload the UI itself
 *                      fetched, and the delta a known seed must produce. This is what
 *                      separates "a number is displayed" from "the number is true".
 *
 * Account safety: `POST /api/login` adds **2** to `login_attempts` per failure and
 * locks at `>= 3`. TC-18 sends exactly one wrong password to the seeded admin only
 * after the worker-scoped admin token has been obtained; the next successful worker
 * login resets the counter. Every throwaway identity is unique per `tc_id` AND per
 * run, so no two cases can ever share a user row (the SUT has no
 * UNIQUE constraint on `users.email`, so a repeated address would silently resolve to
 * whichever row was inserted first and quietly couple two cases together).
 */

/** Per-run tag, so accounts registered by this run cannot collide with a previous one. */
const RUN_ID = `${Date.now().toString(36)}${process.pid.toString(36)}`;
const GENERATED_PASSWORD = 'Test1234!';

/** Not a real JWT - used by the malformed-token rows. */
const MALFORMED_TOKEN = 'not.a.valid.jwt';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'canceled'] as const;

interface SeedSpec {
  amount: number;
  /** `canceled_then_delivered` is not a status - it is the two-step walk TC-13b needs. */
  final_status: OrderStatus | 'canceled_then_delivered';
  repeat?: number;
}

interface DashboardCase extends TestCaseRow {
  layer: 'ui' | 'api';
  hw02_ref: string;
  actor: string;
  credential?: 'valid' | 'wrong_password' | 'unknown_email' | 'empty';
  seed_orders: SeedSpec[] | null;
  cart_items?: api.CartItem[];
  /** Deliberately malformed checkout value; presence is validated even when it is null. */
  raw_total?: unknown;
  expect_recomputed_total?: number;
  check: string;
  expect_revenue_delta: number | null;
  expect_count_delta: number | null;
  /** Decimal places for a delta comparison. Absent = integer, compared exactly. */
  delta_precision?: number;
  /** `at_least` tolerates unrelated orders created concurrently in this global KPI. */
  count_delta_mode?: 'exact' | 'at_least';
  expect_http_any_of: number[] | null;
  expect_dashboard_rendered: boolean | null;
  expect_alert_contains: string | null;
  note: string;
}

const ACTORS = [
  'admin',
  'non_admin',
  'anonymous',
  'malformed_token',
  'expired_token',
  'signed_missing_role',
  'signed_nonexistent_admin',
  'non_admin_token_injected',
  'admin_token_injected',
  'throwaway_user',
] as const;

/**
 * Which fields each `check` cannot run without. The data file is edited far more
 * often than this spec, so a missing or misspelled field must stop the case loudly
 * rather than let it assert nothing and pass - finding 2 of AI_Review_Gap_Analysis.md
 * applied deliberately.
 */
const REQUIRED: Record<string, Array<keyof DashboardCase>> = {
  kpi_cards_render: [],
  default_tab_is_dashboard: [],
  revenue_equals_delivered_sum: [],
  order_count_equals_api_length: [],
  revenue_format: [],
  revenue_delta: ['seed_orders', 'expect_revenue_delta'],
  count_delta: ['seed_orders', 'expect_count_delta'],
  revenue_and_count_delta: ['seed_orders', 'expect_revenue_delta', 'expect_count_delta'],
  reload_idempotent: ['expect_revenue_delta', 'expect_count_delta'],
  canceled_to_delivered_refused: ['seed_orders', 'expect_http_any_of'],
  client_total_is_recomputed: ['seed_orders', 'cart_items', 'expect_recomputed_total'],
  ui_login_refused: ['credential', 'expect_alert_contains', 'expect_dashboard_rendered'],
  anonymous_sees_no_kpi: ['expect_dashboard_rendered'],
  ui_token_injection_refused: ['expect_dashboard_rendered'],
  ui_token_injection_renders: ['expect_dashboard_rendered'],
  logout_clears_session: [],
  api_admin_orders_status: ['expect_http_any_of'],
  api_admin_users_status: ['expect_http_any_of'],
  api_status_write_refused: ['seed_orders', 'expect_http_any_of'],
  api_checkout_total_refused: ['expect_http_any_of'],
  api_self_role_escalation_refused: ['expect_http_any_of'],
  api_payload_contract: ['seed_orders', 'expect_http_any_of'],
};

const loaded = loadJson<{ _meta?: { case_count?: number }; cases: DashboardCase[] }>(
  'fr13_dashboard.json',
);

/**
 * Runtime schema validation, run once at collection time.
 *
 * A data-driven suite is only as trustworthy as its data file: a duplicate `tc_id`
 * silently reports two different cases under one name, a misspelled enum selects no
 * branch, and a non-finite amount makes a delta assertion meaningless. None of that is
 * visible to `tsc`, because the file is parsed at runtime. Failing here stops the whole
 * file with a list of problems, which is far cheaper than 50 confusing red cases.
 */
function validateCases(rows: DashboardCase[], declaredCount?: number): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  if (declaredCount !== undefined && declaredCount !== rows.length) {
    problems.push(`_meta.case_count says ${declaredCount} but the file holds ${rows.length} cases`);
  }

  for (const row of rows) {
    const id = row.tc_id ?? '<missing tc_id>';
    if (!row.tc_id) problems.push('a case has no tc_id');
    else if (seen.has(row.tc_id)) problems.push(`duplicate tc_id "${row.tc_id}"`);
    else seen.add(row.tc_id);

    if (!['positive', 'negative', 'edge'].includes(row.type)) {
      problems.push(`${id}: type "${row.type}" is not positive|negative|edge`);
    }
    if (!['ui', 'api'].includes(row.layer)) {
      problems.push(`${id}: layer "${row.layer}" is not ui|api`);
    }
    if (!(ACTORS as readonly string[]).includes(row.actor)) {
      problems.push(`${id}: actor "${row.actor}" is not one of ${ACTORS.join('|')}`);
    }
    if (!row.note) problems.push(`${id}: note is empty - every case must say why it exists`);

    const required = REQUIRED[row.check];
    if (!required) {
      problems.push(
        `${id}: check "${row.check}" is unknown (known: ${Object.keys(REQUIRED).join(', ')})`,
      );
    } else {
      for (const field of required) {
        if (row[field] === undefined || row[field] === null) {
          problems.push(`${id}: check "${row.check}" requires "${String(field)}"`);
        }
      }
    }

    for (const [index, spec] of (row.seed_orders ?? []).entries()) {
      if (typeof spec.amount !== 'number' || !Number.isFinite(spec.amount)) {
        problems.push(`${id}: seed_orders[${index}].amount is not a finite number`);
      }
      const statuses: string[] = [...ORDER_STATUSES, 'canceled_then_delivered'];
      if (!statuses.includes(spec.final_status)) {
        problems.push(`${id}: seed_orders[${index}].final_status "${spec.final_status}" is unknown`);
      }
      if (spec.repeat !== undefined && (!Number.isInteger(spec.repeat) || spec.repeat < 1)) {
        problems.push(`${id}: seed_orders[${index}].repeat must be a positive integer`);
      }
    }

    if (row.expect_http_any_of !== null && row.expect_http_any_of !== undefined) {
      if (!Array.isArray(row.expect_http_any_of) || row.expect_http_any_of.length === 0) {
        problems.push(`${id}: expect_http_any_of must be a non-empty array`);
      } else if (!row.expect_http_any_of.every((code) => Number.isInteger(code))) {
        problems.push(`${id}: expect_http_any_of must contain integers only`);
      }
    }

    if (row.delta_precision !== undefined
      && (!Number.isInteger(row.delta_precision) || row.delta_precision < 0)) {
      problems.push(`${id}: delta_precision must be a non-negative integer`);
    }
    if (row.count_delta_mode !== undefined
      && !['exact', 'at_least'].includes(row.count_delta_mode)) {
      problems.push(`${id}: count_delta_mode must be exact|at_least`);
    }

    if (row.check === 'api_checkout_total_refused'
      && !Object.prototype.hasOwnProperty.call(row, 'raw_total')) {
      problems.push(`${id}: check "api_checkout_total_refused" requires "raw_total" (null is valid test data)`);
    }

    for (const [index, item] of (row.cart_items ?? []).entries()) {
      if (!Number.isFinite(item.price) || !Number.isInteger(item.quantity) || item.quantity < 1) {
        problems.push(`${id}: cart_items[${index}] needs a finite price and a positive quantity`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `fr13_dashboard.json failed validation (${problems.length} problem(s)):\n  - ` +
      problems.join('\n  - '),
    );
  }
}

validateCases(loaded.cases, loaded._meta?.case_count);
const cases = loaded.cases;

/**
 * Sum of `total_amount` over delivered orders - the figure the spec says must be shown.
 *
 * Fails loudly on a missing or non-numeric `total_amount` instead of coercing it. An
 * earlier draft wrote `Number(order.total_amount ?? 0)`, which is the same defect this
 * project logged as gap-analysis finding 15: a nullish default turns "the field I read
 * does not exist" into a plausible number, and the expected value then quietly becomes
 * 0 for every row. The whole point of this function is to be an independent source of
 * truth, so it must break rather than guess.
 */
function deliveredTotal(orders: Array<Record<string, unknown>>): number {
  let sum = 0;
  for (const order of orders) {
    if (order.status !== 'delivered') continue;
    const amount = Number(order.total_amount);
    if (order.total_amount === null || order.total_amount === undefined || !Number.isFinite(amount)) {
      throw new Error(
        `order ${String(order.id)} has an unusable total_amount ` +
        `(${JSON.stringify(order.total_amount)}) - the revenue expectation cannot be computed. ` +
        'If the payload schema changed, fix the reader; do not default it to 0.',
      );
    }
    sum += amount;
  }
  return sum;
}

/** Compares a measured delta at the precision the row declares. */
function expectDelta(actual: number, expected: number, precision: number | undefined, label: string): void {
  if (precision === undefined) {
    expect(actual, label).toBe(expected);
  } else {
    expect(actual, label).toBeCloseTo(expected, precision);
  }
}

test.describe('FR-13 Dashboard', () => {
  for (const row of cases) {
    test(caseTitle(row), async ({
      page,
      request,
      browserName,
      adminDashboardPage,
      adminToken,
      userToken,
    }) => {
      test.info().annotations.push({ type: 'HW02 origin', description: row.hw02_ref });
      test.info().annotations.push({ type: 'Why this case', description: row.note });
      // Preserve the actual Playwright project on every row. This remains reliable
      // even when a legacy run-level BROWSER tag is broad (for example, "all").
      test.info().annotations.push({ type: 'Browser project', description: browserName });

      /**
       * A fresh account per CASE and per run. The email carries the tc_id because
       * `users.email` has no UNIQUE constraint: two cases sharing an address would both
       * resolve to the first inserted row, so orders seeded by one case would be owned
       * by another case's identity.
       */
      const registerThrowaway = async (): Promise<{ email: string; token: string }> => {
        const slug = row.tc_id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const email = `fr13-${slug}-${RUN_ID}@eshop.test`;
        await api.register(request, { name: `FR13 ${row.tc_id}`, email, password: GENERATED_PASSWORD });
        const token = await api.login(request, email, GENERATED_PASSWORD);
        return { email, token };
      };

      const seedOrders = async (ownerToken: string): Promise<number[]> => {
        const ids: number[] = [];
        for (const spec of row.seed_orders ?? []) {
          for (let i = 0; i < (spec.repeat ?? 1); i += 1) {
            const orderId = await api.checkout(request, ownerToken, spec.amount);
            if (spec.final_status === 'canceled_then_delivered') {
              await api.walkToStatus(request, adminToken, orderId, 'canceled');
              await api.setStatusRaw(request, adminToken, orderId, 'delivered');
            } else {
              await api.walkToStatus(request, adminToken, orderId, spec.final_status);
            }
            ids.push(orderId);
          }
        }
        return ids;
      };

      /** Resolves the actor to a token. `null` means "send no Authorization header". */
      const tokenForActor = async (): Promise<string | null> => {
        switch (row.actor) {
          case 'admin':
          case 'admin_token_injected':
            return adminToken;
          case 'non_admin':
          case 'non_admin_token_injected':
            return userToken;
          case 'malformed_token':
            return MALFORMED_TOKEN;
          case 'expired_token': {
            if (!SUT_JWT_SECRET) {
              throw new Error(
                `${row.tc_id} needs SUT_JWT_SECRET in .env to mint an expired token. ` +
                'It is the SUT\'s own constant from backend/server.js:10 - see .env.example.',
              );
            }
            return api.mintExpiredToken(SUT_JWT_SECRET, { id: 1, role: 'admin' });
          }
          case 'signed_missing_role':
          case 'signed_nonexistent_admin': {
            if (!SUT_JWT_SECRET) {
              throw new Error(`${row.tc_id} needs SUT_JWT_SECRET to mint its boundary token`);
            }
            return row.actor === 'signed_missing_role'
              ? api.mintToken(SUT_JWT_SECRET, { id: 1, email: ADMIN_EMAIL })
              : api.mintToken(SUT_JWT_SECRET, {
                id: 2_147_483_647,
                email: `missing-${RUN_ID}@eshop.test`,
                role: 'admin',
              });
          }
          case 'throwaway_user':
            return (await registerThrowaway()).token;
          default:
            return null;
        }
      };

      switch (row.check) {
        /* ---------------- pattern 1: UI state ---------------------------------- */

        case 'kpi_cards_render': {
          await adminDashboardPage.gotoAndLoadDashboard(ADMIN_EMAIL, ADMIN_PASSWORD);
          await expect(adminDashboardPage.revenueValue).toBeVisible();
          await expect(adminDashboardPage.orderCountValue).toBeVisible();
          // "Visible" alone would pass on an empty or NaN card, which is the failure
          // mode a broken KPI actually has.
          expect(
            Number.isFinite(await adminDashboardPage.revenueNumber()),
            'revenue KPI does not parse to a finite number',
          ).toBe(true);
          expect(
            Number.isFinite(await adminDashboardPage.orderCountNumber()),
            'order-count KPI does not parse to a finite number',
          ).toBe(true);
          break;
        }

        case 'default_tab_is_dashboard': {
          await adminDashboardPage.gotoWithTokenAndLoadDashboard(adminToken);
          await expect(adminDashboardPage.dashboardHeading).toBeVisible();
          await expect(adminDashboardPage.revenueLabel).toBeVisible();
          expect(new URL(page.url()).pathname, 'dashboard is not the landing view').toBe('/');
          break;
        }

        case 'revenue_format': {
          await adminDashboardPage.gotoWithTokenAndLoadDashboard(adminToken);
          const rendered = (await adminDashboardPage.revenueValue.innerText()).trim();
          expect(rendered, 'revenue is missing the currency symbol').toContain('₫');

          // ANCHORED on the numeric part. An earlier draft used an unanchored
          // /\d(?:[., ]\d{3})*/, which matches any string containing a single digit -
          // "abc7xyz ₫" would have passed. This requires the whole numeric token to be
          // a correctly grouped en-US figure, so a missing or misplaced separator fails.
          const numeric = rendered.replace('₫', '').trim();
          expect(
            numeric,
            `revenue "${rendered}" is not a grouped decimal figure`,
          ).toMatch(/^-?\d{1,3}(,\d{3})*(\.\d+)?$/);
          break;
        }

        case 'ui_login_refused': {
          const credentials = await (async () => {
            switch (row.credential) {
              case 'valid':
                return { email: USER_EMAIL, password: USER_PASSWORD };
              case 'wrong_password': {
                return { email: ADMIN_EMAIL, password: 'DefinitelyWrong1!' };
              }
              case 'unknown_email':
                return {
                  email: `fr13-nobody-${RUN_ID}@eshop.test`,
                  password: GENERATED_PASSWORD,
                };
              case 'empty':
                return { email: '', password: '' };
              default:
                throw new Error(`${row.tc_id}: credential "${row.credential}" is not handled`);
            }
          })();

          await adminDashboardPage.goto();
          const result = await adminDashboardPage.attemptLogin(
            credentials.email,
            credentials.password,
          );

          expect(result.dialogs.join(' | '), 'the app raised no message')
            .toContain(row.expect_alert_contains as string);
          expect(result.reachedDashboard, 'the dashboard was reached')
            .toBe(row.expect_dashboard_rendered);
          await expect(adminDashboardPage.revenueValue).toBeHidden();
          break;
        }

        case 'anonymous_sees_no_kpi': {
          await adminDashboardPage.goto();
          await expect(adminDashboardPage.loginHeading).toBeVisible();
          // The figure itself must be absent - a dashboard behind a modal would still
          // satisfy "the login form is present".
          await expect(adminDashboardPage.revenueValue).toBeHidden();
          await expect(adminDashboardPage.orderCountValue).toBeHidden();
          break;
        }

        case 'ui_token_injection_refused':
        case 'ui_token_injection_renders': {
          const token = await tokenForActor();
          await adminDashboardPage.goto();
          await adminDashboardPage.injectToken(token as string);
          await page.reload();

          if (row.expect_dashboard_rendered) {
            // Control row: proves injection WORKS, which is what gives the refusal
            // rows their meaning - otherwise they could pass because the mechanism is
            // broken rather than because the role is checked.
            await expect(
              adminDashboardPage.revenueValue,
              'an injected admin token did not reach the dashboard, so the refusal rows prove nothing',
            ).toBeVisible();
          } else {
            await expect(
              adminDashboardPage.revenueValue,
              'a session that never passed the admin check rendered the revenue figure',
            ).toBeHidden();
            await expect(adminDashboardPage.loginHeading).toBeVisible();
          }
          break;
        }

        case 'logout_clears_session': {
          await adminDashboardPage.gotoWithTokenAndLoadDashboard(adminToken);
          await adminDashboardPage.logoutTab.click();
          await expect(adminDashboardPage.loginHeading).toBeVisible();
          // The token, not just the view: a logout that only resets React state leaves a
          // reusable credential in storage.
          const stored = await page.evaluate(() => localStorage.getItem('adminToken'));
          expect(stored, 'the token survived logout').toBeFalsy();
          break;
        }

        /* ---------------- pattern 3: data integrity ---------------------------- */

        case 'revenue_equals_delivered_sum': {
          const orders = await adminDashboardPage.gotoWithTokenAndLoadDashboard(adminToken);
          // Recomputed from the payload the UI itself fetched, so a mismatch cannot be
          // explained away as a stale or differently-filtered request.
          expectFigureMatches(
            await adminDashboardPage.revenueValue.innerText(),
            deliveredTotal(orders),
            'dashboard revenue vs sum of delivered orders',
          );
          break;
        }

        case 'order_count_equals_api_length': {
          const orders = await adminDashboardPage.gotoWithTokenAndLoadDashboard(adminToken);
          expect(
            await adminDashboardPage.orderCountNumber(),
            'order-count KPI does not equal the number of orders returned',
          ).toBe(orders.length);
          break;
        }

        case 'revenue_delta':
        case 'count_delta':
        case 'revenue_and_count_delta':
        case 'reload_idempotent': {
          await adminDashboardPage.gotoWithTokenAndLoadDashboard(adminToken);
          const revenueBefore = await adminDashboardPage.revenueNumber();
          const countBefore = await adminDashboardPage.orderCountNumber();

          if (row.seed_orders) {
            const ownerToken = (await registerThrowaway()).token;
            await seedOrders(ownerToken);
          }

          await adminDashboardPage.reloadAndWaitForOrders();
          const revenueAfter = await adminDashboardPage.revenueNumber();
          const countAfter = await adminDashboardPage.orderCountNumber();

          if (row.expect_revenue_delta !== null) {
            expectDelta(
              revenueAfter - revenueBefore,
              row.expect_revenue_delta,
              row.delta_precision,
              `revenue moved by the wrong amount (before ${revenueBefore}, after ${revenueAfter})`,
            );
          }
          if (row.expect_count_delta !== null) {
            const countDelta = countAfter - countBefore;
            const assertion = expect(
              countDelta,
              `order count moved by the wrong amount (before ${countBefore}, after ${countAfter})`,
            );
            if (row.count_delta_mode === 'at_least') {
              assertion.toBeGreaterThanOrEqual(row.expect_count_delta);
            } else {
              assertion.toBe(row.expect_count_delta);
            }
          }
          break;
        }

        /* ---------------- pattern 2: API / contract ---------------------------- */

        case 'canceled_to_delivered_refused': {
          const ownerToken = (await registerThrowaway()).token;
          const orderId = await api.checkout(request, ownerToken, row.seed_orders![0].amount);
          await api.walkToStatus(request, adminToken, orderId, 'canceled');

          const response = await api.setStatusRaw(request, adminToken, orderId, 'delivered');
          await expectStatusAmong(
            response,
            row.expect_http_any_of as number[],
            `${row.tc_id}: canceled -> delivered`,
          );
          break;
        }

        case 'client_total_is_recomputed': {
          const submitted = row.seed_orders![0].amount;
          const ownerToken = (await registerThrowaway()).token;
          for (const item of row.cart_items!) {
            await api.addToCart(request, ownerToken, item);
          }
          const orderId = await api.checkoutRaw(request, ownerToken, submitted, row.cart_items);
          expect(orderId.ok(), `${row.tc_id}: checkout failed`).toBeTruthy();
          const orderBody = await orderId.json();
          const createdOrderId = orderBody.orderId as number;

          const orders = (await (await api.adminOrdersListRaw(request, adminToken)).json()) as Array<
            Record<string, unknown>
          >;
          const stored = orders.find((order) => Number(order.id) === createdOrderId);
          expect(stored, `${row.tc_id}: seeded order ${createdOrderId} not found`).toBeTruthy();

          // README FR-08 requires the backend to recompute the total FROM THE CART. The
          // exact figure is asserted, not merely "different from what was sent": a build
          // that stored some other wrong number, or clamped to 0, would satisfy a
          // not-equal check while still being wrong.
          expect(
            Number(stored!.total_amount),
            `the stored total must be the cart total ${row.expect_recomputed_total}, ` +
            `not the client-submitted ${submitted}`,
          ).toBe(row.expect_recomputed_total);
          break;
        }

        case 'api_admin_orders_status':
        case 'api_admin_users_status': {
          const token = await tokenForActor();
          const response = row.check === 'api_admin_users_status'
            ? await api.adminUsersListRaw(request, token)
            : await api.adminOrdersListRawMaybe(request, token);

          await expectStatusAmong(
            response,
            row.expect_http_any_of as number[],
            `${row.tc_id}: ${row.actor}`,
          );
          if (row.type === 'positive') {
            expect(Array.isArray(await response.json()), 'admin list did not return an array').toBe(true);
          }
          break;
        }

        case 'api_payload_contract': {
          const ownerToken = (await registerThrowaway()).token;
          const seeded = await seedOrders(ownerToken);

          const response = await api.adminOrdersListRawMaybe(request, adminToken);
          await expectStatusAmong(
            response,
            row.expect_http_any_of as number[],
            `${row.tc_id}: admin orders list`,
          );
          const orders = (await response.json()) as Array<Record<string, unknown>>;
          const seededRow = orders.find((order) => Number(order.id) === seeded[0]);
          expect(seededRow, `${row.tc_id}: seeded order ${seeded[0]} is absent from the payload`)
            .toBeTruthy();

          // Every revenue assertion in this suite reads these two fields off this
          // payload, so their names and types are a contract. This is the row that would
          // have caught the scaffold's `order.total` mistake at the contract rather than
          // as a confusing revenue mismatch.
          expect(typeof seededRow!.id, 'id is not a number').toBe('number');
          expect(
            Number.isFinite(Number(seededRow!.total_amount)),
            `total_amount ${JSON.stringify(seededRow!.total_amount)} is not numeric`,
          ).toBe(true);
          expect(
            ORDER_STATUSES as readonly string[],
            `status "${String(seededRow!.status)}" is outside the known set`,
          ).toContain(seededRow!.status);
          break;
        }

        case 'api_status_write_refused': {
          const ownerToken = (await registerThrowaway()).token;
          const orderId = await api.checkout(request, ownerToken, row.seed_orders![0].amount);
          const response = await api.setStatusRaw(request, await tokenForActor(), orderId, 'confirmed');
          const responseBody = await response.text();
          expect.soft(
            row.expect_http_any_of as number[],
            `${row.tc_id}: ${row.actor} writing order status returned ` +
            `${response.status()} ${responseBody}`,
          ).toContain(response.status());

          // A refusal status is not enough: a broken handler could mutate first and
          // reject afterwards. Read through the owner's endpoint and prove the order
          // remains pending.
          const after = (await api.myOrders(request, ownerToken))
            .find((order) => Number(order.id) === orderId);
          expect(after, `${row.tc_id}: seeded order disappeared after refused write`).toBeTruthy();
          expect.soft(after!.status, 'a refused status write still mutated the order')
            .toBe('pending');
          break;
        }

        case 'api_checkout_total_refused': {
          const ownerToken = (await registerThrowaway()).token;
          const before = await api.myOrders(request, ownerToken);
          const response = await api.checkoutRaw(request, ownerToken, row.raw_total);
          const responseBody = await response.text();
          const after = await api.myOrders(request, ownerToken);

          expect.soft(
            row.expect_http_any_of as number[],
            `${row.tc_id}: invalid total ${JSON.stringify(row.raw_total)} returned ` +
            `${response.status()} ${responseBody}`,
          ).toContain(response.status());
          expect.soft(
            after.length,
            'invalid checkout created an order and can corrupt the dashboard count/revenue source',
          ).toBe(before.length);
          break;
        }

        case 'api_self_role_escalation_refused': {
          const { token } = await registerThrowaway();
          const response = await api.updateMeRaw(request, token, {
            name: `FR13 ${row.tc_id}`,
            role: 'admin',
          });
          await expectStatusAmong(
            response,
            row.expect_http_any_of as number[],
            `${row.tc_id}: self-promotion to admin`,
          );
          // The status alone is a claim; what matters is whether the role actually moved.
          const me = await api.getMe(request, token);
          expect(me.role, 'the account granted itself the admin role').not.toBe('admin');
          break;
        }

        default:
          throw new Error(`${row.tc_id}: unhandled check "${row.check}"`);
      }
    });
  }
});
