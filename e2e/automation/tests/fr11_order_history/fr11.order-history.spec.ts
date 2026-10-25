import {
  SUT_JWT_SECRET, assertCredentialsPresent,
} from '../../utils/env';
import { test, expect } from '../../fixtures/test-fixtures';
import { loadJson, caseTitle, type TestCaseRow } from '../../utils/data-loader';
import { expectStatusAmong, expectSortedDescByNumber } from '../../utils/assertions';
import * as api from '../../utils/eshop-api';
import type { OrderStatus } from '../../utils/eshop-api';
import { readFr11AuthState } from '../../utils/fr11-auth-cache';

/**
 * FR-11 Order history view, user (Pool B) - HW04 Task 1.
 *
 * All 46 cases come from `automation/data/fr11_order_history.json`; there is no case
 * literal in this file. The feature is rendered at `/profile`, not at `/orders` - see
 * the correction at the top of docs/test-plan/TC_Matrix_FR11.md.
 *
 * Approach: **API setup, then assert.** Every order this suite reasons about is created
 * by the fixture through the API, because the statuses FR-11 displays are not reachable
 * any other way. `row.channel` then decides where the assertion lands:
 *
 *   ui   (26 rows) assert on the rendered table at /profile
 *   api  (20 rows) assert on the response of the endpoint named in `row.api_call`
 *
 * Expected values are the ones the requirement asks for, not the ones this build
 * produces. 15 rows are predicted to come back red, clustering into 9 root causes
 * (table at the end of the matrix). A red case here is a finding to triage, not an
 * assertion to soften - project rule §4.
 *
 * Assertion patterns used (the brief wants >= 3 genuinely distinct ones):
 *   1 UI state       - badge label and colour class, empty state, button presence,
 *                      the row's status after an action
 *   2 API / contract - status code of the detail, cancel, admin and checkout endpoints
 *   3 data integrity - the rendered rows must match the my-orders payload and must not
 *                      contain another user's order; the id column must be sorted; the
 *                      date must parse; the money cell must mean an amount. This is what
 *                      separates "a table rendered" from "the table tells the truth".
 *
 * Cross-run safety: the SUT database is never reset between the 9 required runs, so the
 * owner account accumulates orders monotonically. Nothing here asserts an absolute row
 * count, every assertion is scoped to the ids this run seeded, and the two extra
 * identities are registered fresh per run.
 */

interface SeedSpec {
  status: OrderStatus;
  /** `unknown` on purpose: TC-31/33/34 seed values that are not valid amounts. */
  total_amount?: unknown;
}

interface OrderHistoryCase extends TestCaseRow {
  channel: 'ui' | 'api';
  account?: 'owner' | 'empty' | 'anonymous';
  acting_as?: 'owner' | 'other' | 'admin' | 'none' | 'ghost';
  session?: 'valid' | 'none' | 'garbage' | 'expired';
  seed_owner_orders?: SeedSpec[];
  seed_other_orders?: number;
  transition_from?: OrderStatus;
  set_status?: string;
  api_call?: 'order_detail' | 'admin_orders_list' | 'admin_set_status' | 'order_cancel'
    | 'order_cancel_race' | 'checkout' | 'my_orders';
  detail_order_id?: string;
  detail_owned_by?: 'owner' | 'other' | 'nonexistent' | 'seeded_first';
  cancel_target_status?: OrderStatus;
  expect_final_status?: OrderStatus;
  cancel_owned_by?: 'owner' | 'other';
  checkout_total_amount?: unknown;
  act?: 'click_cancel';
  intercept?: 'my_orders_500' | 'my_orders_non_array' | 'my_orders_nested_non_array';
  assert?: string;
  expect_status?: OrderStatus;
  expect_label?: string;
  expect_badge_class?: string;
  expect_cancel_visible?: boolean;
  /** Explicit, checked opt-out from asserting cancel visibility - see the CONDITIONAL rule. */
  cancel_visibility_owned_by?: string;
  expect_cancel_allowed?: boolean;
  expect_dialog?: string;
  expect_label_after?: string;
  expect_money_text?: string;
  expect_money_not?: string;
  expect_row_count?: number;
  expect_distinct_badge_count?: number;
  expect_cancel_count?: number;
  expect_sorted_desc_by?: string;
  expect_http_any_of?: number[];
  expect_http_multiset?: number[];
  expect_total_amount?: number;
  note: string;
}

const { cases } = loadJson<{ cases: OrderHistoryCase[] }>('fr11_order_history.json');

/**
 * The data file is edited far more often than this spec is, so a missing or misspelled
 * field must stop the case loudly rather than let it assert nothing and pass. This is
 * finding 2 in AI_Review_Gap_Analysis.md applied on purpose: an unguarded dispatch let a
 * typo select the success branch for a case written to be refused.
 */
/** UI rows dispatch on `assert`. */
const UI_REQUIRED: Record<string, Array<keyof OrderHistoryCase>> = {
  own_rows_and_isolation: ['seed_owner_orders', 'seed_other_orders'],
  row_contract: ['seed_owner_orders', 'expect_label', 'expect_total_amount'],
  // `expect_cancel_visible` is NOT required here - see the CONDITIONAL rule that makes
  // its absence legal only when the row names which cases own that requirement instead.
  status_badge: ['seed_owner_orders', 'expect_label', 'expect_badge_class'],
  empty_state: ['expect_row_count'],
  not_logged_in: ['session', 'expect_row_count'],
  badges_distinct: ['seed_owner_orders', 'expect_distinct_badge_count'],
  cancel_visibility: ['seed_owner_orders', 'expect_cancel_count'],
  ordering: ['seed_owner_orders', 'expect_sorted_desc_by'],
  date_valid: ['seed_owner_orders'],
  money_render: ['seed_owner_orders'],
  cancel_click: ['seed_owner_orders', 'act', 'expect_cancel_allowed', 'expect_label_after'],
  load_error: ['intercept'],
  malformed_payload: ['intercept'],
  status_after_transition: ['seed_owner_orders', 'set_status', 'expect_label_after'],
};

/**
 * API rows dispatch on `api_call`, not on `assert` - the endpoint IS the branch, so a
 * separate `assert` value would be a second name for the same thing and could disagree
 * with it. Keyed the same way the switch below is keyed, deliberately: a guard that
 * validates against a different key than the dispatch uses can pass a row the dispatch
 * then cannot handle.
 */
const API_REQUIRED: Record<string, Array<keyof OrderHistoryCase>> = {
  order_detail: ['acting_as', 'detail_owned_by', 'expect_http_any_of'],
  admin_orders_list: ['acting_as', 'expect_http_any_of'],
  admin_set_status: ['acting_as', 'seed_owner_orders', 'set_status', 'expect_http_any_of'],
  order_cancel: ['acting_as', 'cancel_owned_by', 'expect_http_any_of'],
  order_cancel_race: [
    'acting_as', 'seed_owner_orders', 'expect_final_status', 'expect_http_multiset',
  ],
  checkout: ['acting_as', 'checkout_total_amount', 'expect_http_any_of'],
  my_orders: ['acting_as', 'expect_http_any_of'],
};

/**
 * Fields that only some rows in a branch carry, with the rule that decides when. Left
 * out of the tables above because "required" would be a lie, but they still may not be
 * silently absent: each one names the assertion that would otherwise vanish.
 */
const CONDITIONAL: Array<{
  applies: (row: OrderHistoryCase) => boolean;
  ok: (row: OrderHistoryCase) => boolean;
  why: string;
}> = [
  {
    // Without this, a money_render row with neither expectation runs no assertion at
    // all and passes - the exact silent pass the guard exists to prevent.
    applies: (row) => row.assert === 'money_render',
    ok: (row) => row.expect_money_text !== undefined || row.expect_money_not !== undefined,
    why: 'money_render needs at least one of expect_money_text / expect_money_not, ' +
         'or the case asserts nothing about the money cell and passes vacuously',
  },
  {
    applies: (row) => row.assert === 'cancel_click' && row.expect_cancel_allowed === true,
    ok: (row) => row.expect_dialog === undefined || typeof row.expect_dialog === 'string',
    why: 'expect_dialog must be a string when present',
  },
  {
    /*
     * A status_badge row may omit expect_cancel_visible ONLY by declaring which cases
     * assert that requirement instead. TC-11 does exactly that: carrying `true` for a
     * shipping order would have locked in the defect, so a correct SUT - one that hides
     * the button once an order ships - would have turned a positive case red. Making the
     * opt-out an explicit, machine-checked field is what stops "we decided not to assert
     * it" from being indistinguishable from "we forgot".
     */
    applies: (row) => row.assert === 'status_badge',
    ok: (row) => row.expect_cancel_visible !== undefined
      || typeof row.cancel_visibility_owned_by === 'string',
    why: 'a status_badge row must either assert expect_cancel_visible or name the cases ' +
         'that own the cancel-visibility requirement in cancel_visibility_owned_by',
  },
  {
    // A refused transition/cancel is only proven by re-reading the order, and that check
    // needs to know what the status should still be.
    applies: (row) => row.channel === 'api'
      && (row.api_call === 'admin_set_status' || row.api_call === 'order_cancel')
      && !(row.expect_http_any_of ?? []).includes(200),
    ok: (row) => row.api_call === 'admin_set_status'
      ? row.transition_from !== undefined
      : row.cancel_target_status !== undefined,
    why: 'a row that expects a refusal must state the status the order should still ' +
         'hold (transition_from / cancel_target_status), otherwise the "was it mutated ' +
         'anyway?" check is skipped and the case passes on the status code alone',
  },
];

/** Coverage rules over the whole file, not over one row. */
const FILE_RULES: Array<{ ok: (rows: OrderHistoryCase[]) => boolean; why: string }> = [
  {
    ok: (rows) => new Set(rows.map((r) => r.tc_id)).size === rows.length,
    why: 'tc_id values must be unique - a duplicate silently overwrites nothing but makes ' +
         'the matrix untraceable',
  },
  {
    ok: (rows) => rows.some((r) => r.assert === 'cancel_click' && r.expect_dialog !== undefined),
    why: 'at least one cancel_click case must assert the confirmation message, or the ' +
         'SUT\'s only feedback channel has no owner',
  },
  {
    ok: (rows) => rows.every((r) => typeof r.note === 'string' && r.note.length > 0),
    why: 'every case must carry a note saying why it exists',
  },
  {
    // A dangling reference in an opt-out is worse than no opt-out: it reads as coverage
    // that does not exist.
    ok: (rows) => {
      const ids = new Set(rows.map((r) => r.tc_id));
      // `String(...)` is load-bearing, not cosmetic: OrderHistoryCase inherits
      // `[key: string]: unknown` from TestCaseRow, and at this call site the property
      // resolves through that index signature, so `?? ''` yields `{}` rather than a
      // string and `.split` does not exist on it.
      return rows.every((r) => String(r.cancel_visibility_owned_by ?? '')
        .split(',').map((s: string) => s.trim()).filter(Boolean)
        .every((referenced: string) => ids.has(referenced)));
    },
    why: 'every tc_id named in cancel_visibility_owned_by must exist in this file',
  },
];

function requireFields(row: OrderHistoryCase): void {
  const [key, table, keyName] = row.channel === 'api'
    ? [row.api_call, API_REQUIRED, 'api_call'] as const
    : [row.assert, UI_REQUIRED, 'assert'] as const;

  const required = table[key ?? ''];
  if (!required) {
    throw new Error(
      `${row.tc_id}: ${keyName} "${key}" is not a known branch for channel ` +
      `"${row.channel}" - fix the data file or add the block. ` +
      `Known: ${Object.keys(table).join(', ')}`,
    );
  }
  for (const field of required) {
    const value = row[field];
    if (value === undefined) {
      throw new Error(
        `${row.tc_id}: ${keyName} "${key}" needs field "${String(field)}", ` +
        `which is missing from the data file`,
      );
    }
    // An empty seed array would leave seededIds[0] undefined and every assertion
    // scoped to it would then be asserted against `undefined`.
    if (Array.isArray(value) && value.length === 0) {
      throw new Error(
        `${row.tc_id}: ${keyName} "${key}" needs a NON-EMPTY "${String(field)}"`,
      );
    }
  }
  for (const rule of CONDITIONAL) {
    if (rule.applies(row) && !rule.ok(row)) {
      throw new Error(`${row.tc_id}: ${rule.why}`);
    }
  }
}

/**
 * Validated at MODULE LOAD, so `playwright test --list` and any collection run report a
 * malformed data file. Validating inside the test body was not enough: `--list` never
 * executes a body, so a broken row looked collectible and only failed during the real
 * run - which is how the missing `.env` stayed hidden behind a green-looking `--list`
 * (finding 30).
 */
function validateAllCases(rows: OrderHistoryCase[]): void {
  const problems: string[] = [];
  for (const row of rows) {
    try {
      requireFields(row);
    } catch (error) {
      problems.push((error as Error).message);
    }
  }
  for (const rule of FILE_RULES) {
    if (!rule.ok(rows)) problems.push(rule.why);
  }
  if (problems.length > 0) {
    throw new Error(
      `fr11_order_history.json is invalid (${problems.length} problem(s)):\n  - ` +
      problems.join('\n  - '),
    );
  }
}

validateAllCases(cases);

test.describe('FR-11 Order history view', () => {
  let ownerToken = '';
  let adminToken = '';
  let otherToken = '';
  let emptyToken = '';

  /**
   * Load the four identities authenticated once by globalSetup.
   *
   * The SUT limits the whole `/api` surface to 200 requests per 15 minutes per IP.
   * Logging inside each test consumed 80 requests before setup. Moving it to beforeAll
   * looked sufficient, but Playwright restarts a worker after every failing test and
   * therefore reruns beforeAll. The first corrected Chromium attempt reached seven
   * expected red cases, then hit 429 again. globalSetup lives above worker restarts;
   * replacement workers only read the OS-temp cache. Login is FR-02, not this feature,
   * and the real limiter remains enabled.
   */
  test.beforeAll(() => {
    assertCredentialsPresent('FR-11');
    if (!SUT_JWT_SECRET && cases.some((row) => row.session === 'expired' || row.acting_as === 'ghost')) {
      throw new Error(
        'FR-11 expired/ghost-token cases need SUT_JWT_SECRET in .env; the value comes ' +
        'from the SUT source and must not be printed or committed',
      );
    }

    ({ ownerToken, adminToken, otherToken, emptyToken } = readFr11AuthState());
  });

  for (const row of cases) {
    test(caseTitle(row), async ({ page, request, loginPage, orderHistoryPage }) => {
      /* ---------------- setup: identities ---------------- */

      const ensureOther = async (): Promise<string> => otherToken;

      /* ---------------- setup: orders ---------------- */

      const seededIds: number[] = [];
      for (const spec of row.seed_owner_orders ?? []) {
        seededIds.push(await api.seedOrder(request, ownerToken, adminToken, spec));
      }

      const otherIds: number[] = [];
      for (let i = 0; i < (row.seed_other_orders ?? 0); i++) {
        otherIds.push(await api.checkout(request, await ensureOther(), 2_000_000));
      }

      /* ---------------- API channel ---------------- */

      if (row.channel === 'api') {
        const tokenFor = async (): Promise<string | null> => {
          switch (row.acting_as) {
            case 'owner': return ownerToken;
            case 'admin': return adminToken;
            case 'other': return ensureOther();
            case 'none': return null;
            case 'ghost':
              return api.mintToken(SUT_JWT_SECRET, { id: 2_147_483_647, role: 'user' });
            default:
              throw new Error(`${row.tc_id}: acting_as "${row.acting_as}" is not a known identity`);
          }
        };
        const token = await tokenFor();

        // Race cases use a status multiset instead of one allowed-status list. Keep
        // this shared flag false for that branch; every denial branch is guarded by
        // data validation that requires expect_http_any_of.
        const expectsDenial = row.expect_http_any_of !== undefined
          && !row.expect_http_any_of.includes(200);

        /**
         * Every status assertion in this branch is SOFT, on purpose.
         *
         * A hard `expect` throws, so when a denial case is answered `200` - which is
         * what 6 of these rows are predicted to do - the assertion aborts the test
         * before the follow-up check runs, and the report says only "expected 403, got
         * 200". The far more serious facts (the record was disclosed; the status was
         * written anyway) would never be collected. Soft failures still fail the test,
         * so nothing is weakened: both statements land in the same report. Same
         * reasoning as finding 3, which is where this pattern came from.
         */
        switch (row.api_call) {
          case 'order_detail': {
            // The id is either written literally in the data file (the malformed and
            // boundary probes) or resolved from what this run seeded.
            const id = row.detail_order_id ?? (
              row.detail_owned_by === 'other' ? String(otherIds[0]) : String(seededIds[0])
            );
            const response = await api.orderDetailRaw(request, token, id);
            // Evidence first, assertion second: reading the body cannot be skipped by a
            // status assertion that throws.
            const disclosed = response.status() === 200 ? await response.json() : null;

            await expectStatusAmong(
              response, row.expect_http_any_of!, `${row.tc_id} order detail`, { soft: true },
            );

            // Pattern 3: a refusal that still ships the record is not a refusal.
            if (expectsDenial && disclosed !== null) {
              expect(
                disclosed,
                `${row.tc_id}: the request was refused-by-requirement yet the order record ` +
                `was returned in full - fields: ${Object.keys(disclosed).join(', ')}`,
              ).not.toHaveProperty('total_amount');
            }
            break;
          }

          case 'admin_orders_list': {
            const response = await api.adminOrdersListRaw(request, token!);
            const leaked = response.status() === 200 ? await response.json() : null;

            await expectStatusAmong(
              response, row.expect_http_any_of!, `${row.tc_id} admin order list`, { soft: true },
            );

            // Pattern 3: scale is the finding here. "A non-admin got 200" understates it
            // if the body was every order in the database, with each owner's name.
            if (expectsDenial && Array.isArray(leaked)) {
              expect(
                leaked.length,
                `${row.tc_id}: a non-admin account was served ${leaked.length} orders ` +
                `belonging to other users`,
              ).toBe(0);
            }
            break;
          }

          case 'admin_set_status': {
            const response = await api.setStatusRaw(request, token!, seededIds[0], row.set_status!);
            await expectStatusAmong(
              response, row.expect_http_any_of!, `${row.tc_id} set status`, { soft: true },
            );

            // Pattern 3: a refused transition must also have left the row alone. A 400
            // that still wrote the new status would pass on the code alone. The
            // conditional guard makes transition_from mandatory on these rows, so the
            // check can never be silently skipped.
            if (expectsDenial) {
              const after = (await api.myOrders(request, ownerToken))
                .find((o) => o.id === seededIds[0]);
              expect(
                after?.status,
                `${row.tc_id}: status was changed to "${row.set_status}" despite the refusal`,
              ).toBe(row.transition_from);
            }
            break;
          }

          case 'order_cancel': {
            const targetIsOther = row.cancel_owned_by === 'other';
            const target = targetIsOther ? otherIds[0] : seededIds[0];
            const response = await api.cancelRaw(request, token, target);
            await expectStatusAmong(
              response, row.expect_http_any_of!, `${row.tc_id} cancel`, { soft: true },
            );

            // Pattern 3: the order must still hold the status it had. Read through the
            // account that actually OWNS it - my-orders filters on user_id, so asking
            // with the owner's token for `other`'s order returns nothing and the check
            // would silently pass on `undefined`.
            if (expectsDenial) {
              const readerToken = targetIsOther ? await ensureOther() : ownerToken;
              const after = (await api.myOrders(request, readerToken))
                .find((o) => o.id === target);
              expect(
                after,
                `${row.tc_id}: order #${target} is not visible to its own owner, so the ` +
                `integrity check cannot run - the fixture is wrong, not the SUT`,
              ).toBeDefined();
              expect(
                after?.status,
                `${row.tc_id}: order #${target} was cancelled despite the request being ` +
                `refused${targetIsOther ? ' - and it belongs to another user' : ''}`,
              ).toBe(row.cancel_target_status);
            }
            break;
          }

          case 'order_cancel_race': {
            const target = seededIds[0];
            const responses = await Promise.all([
              api.cancelRaw(request, token, target),
              api.cancelRaw(request, token, target),
            ]);
            const actual = responses.map((response) => response.status()).sort((a, b) => a - b);
            const expected = [...row.expect_http_multiset!].sort((a, b) => a - b);
            expect(
              actual,
              `${row.tc_id}: two simultaneous cancel requests must produce one success and ` +
              `one refusal, not acknowledge the same state transition twice`,
            ).toEqual(expected);
            const after = (await api.myOrders(request, ownerToken)).find((o) => o.id === target);
            expect(after?.status, `${row.tc_id}: final status after the race`)
              .toBe(row.expect_final_status);
            break;
          }

          case 'checkout': {
            const response = await api.checkoutRaw(request, ownerToken, row.checkout_total_amount);
            await expectStatusAmong(
              response, row.expect_http_any_of!, `${row.tc_id} checkout`, { soft: true },
            );

            // Pattern 3: a rejected checkout must not have created an order. Otherwise a
            // 400 that writes the row anyway passes on the status alone.
            if (expectsDenial && response.status() === 200) {
              const body = await response.json();
              const created = (await api.myOrders(request, ownerToken))
                .find((o) => o.id === body.orderId);
              expect(
                created,
                `${row.tc_id}: checkout accepted total_amount ` +
                `${JSON.stringify(row.checkout_total_amount)} and created order ` +
                `#${body.orderId}, whose stored total is ` +
                `${JSON.stringify(created?.total_amount)}`,
              ).toBeUndefined();
            }
            break;
          }

          case 'my_orders': {
            const response = await api.myOrdersRaw(request, token);
            await expectStatusAmong(
              response, row.expect_http_any_of!, `${row.tc_id} my-orders`, { soft: true },
            );
            if (!row.expect_http_any_of!.includes(200) && response.status() === 200) {
              const body = await response.json();
              expect(
                body,
                `${row.tc_id}: a correctly signed token for a user that does not exist ` +
                `was accepted as a live session and received an order-history payload`,
              ).toBeNull();
            }
            break;
          }

          default:
            throw new Error(`${row.tc_id}: api_call "${row.api_call}" is not a known endpoint`);
        }
        return;
      }

      /* ---------------- UI channel ---------------- */

      // Forced failures for the two load_error rows. Registered before navigation so the
      // very first fetch is the intercepted one.
      if (row.intercept === 'my_orders_500') {
        await page.route('**/api/orders/my-orders', (route) =>
          route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
      }
      if (row.intercept === 'my_orders_non_array') {
        // Exercises the documented fallback branch `res.data.orders`, with an id no
        // seeded order can collide with.
        await page.route('**/api/orders/my-orders', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              orders: [{
                id: 424242, user_id: 0, total_amount: 123000,
                status: 'pending', shipping_address: 'x', created_at: '2026-01-02 03:04:05',
              }],
            }),
          }));
      }
      if (row.intercept === 'my_orders_nested_non_array') {
        await page.route('**/api/orders/my-orders', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ orders: 'not-an-array' }),
          }));
      }

      // The dialog is the SUT's only feedback channel for cancel (Profile.jsx uses
      // alert()), so it is captured rather than left to Playwright's auto-dismiss.
      const dialogs: string[] = [];
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        void dialog.accept();
      });

      switch (row.account) {
        case 'owner':
          // FR-11 tests the profile/order-history behaviour, not FR-02 login. Staging
          // the already-proven token avoids one unrelated login request per UI case.
          await loginPage.injectToken(ownerToken);
          break;
        case 'empty':
          await loginPage.injectToken(emptyToken);
          break;
        case 'anonymous':
          if (row.session === 'garbage') {
            await loginPage.injectToken('not.a.valid.jwt');
          } else if (row.session === 'expired') {
            await loginPage.injectToken(
              api.mintExpiredToken(SUT_JWT_SECRET, { id: 2_147_483_647, role: 'user' }),
            );
          } else {
            await loginPage.clearSession();
          }
          break;
        default:
          throw new Error(`${row.tc_id}: account "${row.account}" is not a known identity`);
      }

      // The transition a UI case performs as part of its own setup (TC-23): bring the
      // order to `transition_from`, then attempt `set_status` and assert on what the
      // page then displays, whatever the endpoint answered.
      if (row.set_status && row.assert === 'status_after_transition') {
        await api.setStatusRaw(request, adminToken, seededIds[0], row.set_status);
      }

      if (row.account === 'anonymous' && (row.session === 'garbage' || row.session === 'expired')) {
        // AuthContext initialises `user` to null and only then validates the token via
        // /api/users/me. Asserting straight after navigation would therefore pass even
        // for a token the app went on to ACCEPT - the message is on screen either way.
        // Waiting for the validation call is what makes this case falsifiable, and its
        // status is a contract assertion in its own right (pattern 2).
        const authCheck = page.waitForResponse((r) => r.url().includes('/api/users/me'));
        await orderHistoryPage.goto();
        const response = await authCheck;
        expect(
          response.status(),
          `${row.tc_id}: /api/users/me accepted a syntactically invalid token`,
        ).not.toBe(200);
        await orderHistoryPage.waitForReady();
      } else if (row.account === 'anonymous') {
        await orderHistoryPage.gotoWithoutSession();
      } else {
        // Waits for the real my-orders response, so no assertion can run against the
        // pre-fetch empty state that Profile.jsx renders from `orders = []`.
        const payload = await orderHistoryPage.gotoAndWaitForOrders();

        if (row.assert === 'own_rows_and_isolation') {
          // Pattern 1: the rows this run seeded are on screen.
          for (const id of seededIds) {
            await expect(
              orderHistoryPage.rowFor(id),
              `${row.tc_id}: order #${id} is missing from the history`,
            ).toHaveCount(1);
          }
          // Pattern 3: the table agrees with the payload, exactly - no row invented, none
          // dropped. Compared as sets of ids, because the run's own accumulated orders
          // make an absolute count meaningless.
          const rendered = await orderHistoryPage.orderIds();
          const fromApi = (payload as Array<{ id: number }>).map((o) => o.id);
          expect(
            [...rendered].sort((a, b) => a - b),
            `${row.tc_id}: rendered rows do not match the my-orders payload`,
          ).toEqual([...fromApi].sort((a, b) => a - b));
          // Pattern 3: and it contains nothing belonging to the other identity.
          for (const foreignId of otherIds) {
            expect(
              rendered,
              `${row.tc_id}: order #${foreignId} belongs to another user but is listed here`,
            ).not.toContain(foreignId);
          }
          return;
        }
      }

      switch (row.assert) {
        case 'row_contract': {
          const id = seededIds[0];
          const payload = (await api.myOrders(request, ownerToken)).find((order) => order.id === id);
          expect(payload, `${row.tc_id}: seeded order #${id} is absent from my-orders`)
            .toBeDefined();
          expect(payload?.status, `${row.tc_id}: API status`).toBe(row.seed_owner_orders![0].status);
          expect(payload?.total_amount, `${row.tc_id}: API total`).toBe(row.expect_total_amount);
          await expect(orderHistoryPage.cellOf(id, 1)).toHaveText(`#${id}`);
          await expect(orderHistoryPage.cellOf(id, 2)).not.toHaveText('');
          const expectedMoney = await page.evaluate(
            (amount) => `${Number(amount).toLocaleString()} ₫`, row.expect_total_amount!,
          );
          await expect(orderHistoryPage.cellOf(id, 3)).toHaveText(expectedMoney);
          await expect(orderHistoryPage.statusBadge(id)).toHaveText(row.expect_label!);
          break;
        }

        case 'status_badge': {
          const id = seededIds[0];
          await expect(orderHistoryPage.statusBadge(id)).toHaveText(row.expect_label!);
          const badgeClass = await orderHistoryPage.badgeClassOf(id);
          for (const token of row.expect_badge_class!.split(' ')) {
            expect(
              badgeClass,
              `${row.tc_id}: badge for "${row.expect_status}" lacks the colour class ${token}`,
            ).toContain(token);
          }
          // Only when the row asserts it. `undefined` must NOT collapse to 0 here - that
          // would silently assert "hidden" for the row that deliberately delegates this
          // requirement (TC-11), which is the opposite of what it declares.
          if (row.expect_cancel_visible !== undefined) {
            await expect(
              orderHistoryPage.cancelButton(id),
              `${row.tc_id}: cancel button visibility for "${row.expect_status}"`,
            ).toHaveCount(row.expect_cancel_visible ? 1 : 0);
          }
          break;
        }

        case 'empty_state':
          await expect(orderHistoryPage.emptyState).toBeVisible();
          await expect(orderHistoryPage.rows).toHaveCount(row.expect_row_count!);
          await expect(
            orderHistoryPage.table,
            `${row.tc_id}: no table should be rendered for an account with no orders`,
          ).toHaveCount(0);
          break;

        case 'not_logged_in':
          await expect(orderHistoryPage.notLoggedInMessage).toBeVisible();
          // Asserted as well as the message, so a build that renders an empty table to an
          // anonymous visitor cannot pass on the message alone.
          await expect(orderHistoryPage.table).toHaveCount(0);
          await expect(orderHistoryPage.rows).toHaveCount(row.expect_row_count!);
          break;

        case 'badges_distinct': {
          const classes = await Promise.all(
            seededIds.map((id) => orderHistoryPage.badgeClassOf(id)),
          );
          expect(
            new Set(classes).size,
            `${row.tc_id}: the five statuses do not render in ${row.expect_distinct_badge_count} ` +
            `distinct colours - got ${JSON.stringify(classes)}`,
          ).toBe(row.expect_distinct_badge_count);
          break;
        }

        case 'cancel_visibility': {
          const counts = await Promise.all(
            seededIds.map((id) => orderHistoryPage.cancelButton(id).count()),
          );
          const shown = counts.filter((c) => c > 0).length;
          expect(
            shown,
            `${row.tc_id}: cancel offered on ${shown} of the ${seededIds.length} seeded ` +
            `statuses, expected ${row.expect_cancel_count}`,
          ).toBe(row.expect_cancel_count);
          break;
        }

        case 'ordering': {
          // Pattern 3. Asserted on the id column: the date column cannot witness this -
          // see expectSortedDescByNumber for the measured reason.
          const ids = await orderHistoryPage.orderIds();
          expectSortedDescByNumber(ids, `${row.tc_id} ${row.expect_sorted_desc_by}`);
          // And the ids this run seeded must appear newest-first among themselves.
          const seededInOrder = ids.filter((id) => seededIds.includes(id));
          expect(
            seededInOrder,
            `${row.tc_id}: the orders seeded by this run are not newest-first`,
          ).toEqual([...seededIds].reverse());
          break;
        }

        case 'date_valid': {
          const orderId = seededIds[0];
          const rendered = (await orderHistoryPage.cellOf(orderId, 2).innerText()).trim();

          // Pattern 1: the cell must say something, and must not say "Invalid Date".
          expect(rendered, `${row.tc_id}: date cell is empty`).not.toBe('');
          expect(rendered, `${row.tc_id}: date rendered as "Invalid Date"`).not.toContain('Invalid');

          /*
           * Pattern 3: the cell must be THIS order's date.
           *
           * Deliberately NOT `Date.parse(rendered)`. `toLocaleDateString()` emits a
           * localized string, and Node's parser reads `10/08/2026` as 10 August in
           * en-US order while the engine may have written it as 8 October - so the
           * check would either fail on a correct date or pass on a wrong one,
           * differently per browser. That is a false-fail generator across the three
           * required engines, not a test.
           *
           * Instead: take `created_at` from the API, split it into calendar parts IN
           * THE BROWSER (its timezone is what the rendering used), and require the
           * cell to contain each part. Comparing parts rather than a formatted string
           * is order-agnostic, so dd/MM/yyyy and M/d/yyyy both satisfy it while a
           * genuinely wrong date does not.
           */
          const seeded = (await api.myOrders(request, ownerToken)).find((o) => o.id === orderId);
          expect(seeded, `${row.tc_id}: seeded order #${orderId} not returned by my-orders`)
            .toBeDefined();

          const parts = await page.evaluate((createdAt: string) => {
            const date = new Date(createdAt);
            return Number.isNaN(date.getTime()) ? null : {
              year: String(date.getFullYear()),
              month: String(date.getMonth() + 1),
              day: String(date.getDate()),
            };
          }, seeded!.created_at);

          expect(
            parts,
            `${row.tc_id}: the browser cannot parse created_at "${seeded!.created_at}" at all, ` +
            `so the rendered cell cannot be correct either`,
          ).not.toBeNull();

          for (const [name, value] of Object.entries(parts!)) {
            // Zero-padded and unpadded forms both count: "8" must match "08".
            const padded = value.padStart(2, '0');
            expect(
              rendered.includes(value) || rendered.includes(padded),
              `${row.tc_id}: date cell "${rendered}" does not contain the ${name} ` +
              `(${value}) of this order's created_at "${seeded!.created_at}"`,
            ).toBe(true);
          }
          break;
        }

        case 'money_render': {
          const rendered = (await orderHistoryPage.cellOf(seededIds[0], 3).innerText()).trim();
          if (row.expect_money_text !== undefined) {
            expect(rendered, `${row.tc_id}: money cell`).toBe(row.expect_money_text);
          }
          if (row.expect_money_not !== undefined) {
            expect(
              rendered,
              `${row.tc_id}: money cell renders "${rendered}", which must not contain ` +
              `"${row.expect_money_not}" - the seeded total was ` +
              `${JSON.stringify(row.seed_owner_orders![0].total_amount)}`,
            ).not.toContain(row.expect_money_not);
          }
          break;
        }

        case 'cancel_click': {
          const id = seededIds[0];
          const buttonCount = await orderHistoryPage.cancelButton(id).count();
          const cancelResponse = buttonCount > 0
            ? page.waitForResponse((response) =>
              response.url().includes(`/api/orders/${id}/cancel`)
              && response.request().method() === 'PUT')
            : undefined;
          const refreshedHistory = buttonCount > 0
            ? page.waitForResponse((response) =>
              response.url().includes('/api/orders/my-orders')
              && response.request().method() === 'GET')
            : undefined;

          if (row.expect_cancel_allowed) {
            expect(
              buttonCount,
              `${row.tc_id}: no cancel button on an order that should be cancellable`,
            ).toBe(1);
            await orderHistoryPage.cancelButton(id).click();
            if (row.expect_dialog !== undefined) {
              await expect
                .poll(() => dialogs, { message: `${row.tc_id}: no confirmation was shown` })
                .toContain(row.expect_dialog);
            }
          } else if (buttonCount > 0) {
            // The requirement says this must be refused; the button being here at all is
            // already the symptom, so the click is what proves whether it is enforced.
            await orderHistoryPage.cancelButton(id).click();
          }

          // The badge initially contains the expected pre-cancel value. Without waiting
          // for the endpoint, toHaveText(oldValue) can pass immediately before the SUT
          // applies the mutation and refreshes the list (observed on Chromium/Firefox,
          // while faster WebKit exposed the cancellation). Synchronise on the business
          // request, not on an arbitrary delay.
          if (cancelResponse) await cancelResponse;
          if (refreshedHistory) await refreshedHistory;

          // Pattern 1 + 3: what the row says afterwards is the requirement, whichever
          // route got us here - a refusal that still cancels the order fails here.
          await expect(
            orderHistoryPage.statusBadge(id),
            `${row.tc_id}: status after the cancel attempt (dialogs seen: ` +
            `${JSON.stringify(dialogs)})`,
          ).toHaveText(row.expect_label_after!);
          break;
        }

        case 'status_after_transition':
          await expect(
            orderHistoryPage.statusBadge(seededIds[0]),
            `${row.tc_id}: an order the user cancelled must not display as ` +
            `"${row.set_status}"`,
          ).toHaveText(row.expect_label_after!);
          if (row.expect_badge_class) {
            const badgeClass = await orderHistoryPage.badgeClassOf(seededIds[0]);
            for (const token of row.expect_badge_class.split(' ')) {
              expect(badgeClass, `${row.tc_id}: badge colour after the transition`).toContain(token);
            }
          }
          break;

        case 'load_error':
          if (row.intercept === 'my_orders_500') {
            // The requirement: a failure must be reported as a failure. Profile.jsx's
            // catch does setOrders([]), so the empty state is what actually appears -
            // asserting it must NOT appear is the falsifiable form of the requirement.
            await expect(
              orderHistoryPage.emptyState,
              `${row.tc_id}: the order fetch failed with 500, but the page tells the user ` +
              `they have no orders - an error is indistinguishable from an empty history`,
            ).toBeHidden();
          } else {
            // The fallback branch must render the payload it was given.
            await expect(
              orderHistoryPage.rowFor(424242),
              `${row.tc_id}: the documented res.data.orders fallback did not render`,
            ).toHaveCount(1);
          }
          break;

        case 'malformed_payload':
          await expect(
            orderHistoryPage.heading,
            `${row.tc_id}: malformed orders payload crashed the profile instead of ` +
            `showing a controlled error state`,
          ).toBeVisible();
          await expect(
            orderHistoryPage.emptyState,
            `${row.tc_id}: malformed data must not be presented as a genuine empty history`,
          ).toBeHidden();
          break;

        case 'own_rows_and_isolation':
          break; // handled above, where the payload is still in scope

        default:
          throw new Error(
            `${row.tc_id}: assert "${row.assert}" has no UI block - fix the data file`,
          );
      }
    });
  }
});
