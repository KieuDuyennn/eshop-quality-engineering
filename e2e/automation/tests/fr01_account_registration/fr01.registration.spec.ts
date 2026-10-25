import { test, expect } from '../../fixtures/test-fixtures';
import { loadCsv, caseTitle, type TestCaseRow } from '../../utils/data-loader';
import { expectApiResponse } from '../../utils/assertions';

/**
 * FR-01 Account registration (Pool A) - HW04 Task 1.
 *
 * All 43 cases come from `automation/data/fr01_registration.csv`; there is no case
 * literal in this file. Each row says which channel it expects the rejection or the
 * success to arrive on, and that column - not a guess made here - picks the branch:
 *
 *   native   the browser's own `required` check blocks submission (3 rows)
 *   banner   the app renders its error <div> (17 rows)
 *   redirect the app navigates to /login (7 rows)
 *   api      the case exercises the server contract directly, including the 3
 *            omissions unreachable through the form and 12 server-validation rows
 *            added after the first live review (16 rows total)
 *
 * Expected values are the ones the specification asks for, not the ones the current
 * build produces - see docs/test-plan/TC_Matrix_FR01.md. Several rows are therefore
 * expected to come back red on the first run. A red case here is a finding to triage,
 * not an assertion to soften.
 *
 * Assertion patterns used (brief section 6 wants >= 3 distinct ones):
 *   1 UI state       - banner text, URL, native validity
 *   2 API / contract - status code and body of POST /api/register
 *   3 data integrity - after the UI claims success, the account must actually be
 *                      usable, and must carry back the name and email that were
 *                      submitted. This is what separates "the form redirected" from
 *                      "the account exists".
 */

/** The form posts to the API host directly, so it is not baseURL (that is the web UI). */
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * The SUT keeps a real sqlite database that is never reset between the 9 required
 * runs, so any address written into the data file as a constant would be a duplicate
 * from run 2 onward and would fail for a reason that has nothing to do with the case.
 * Every generated address carries this run tag; `{{RUN}}` inserts it into a literal
 * address whose shape matters (TC-20 plus-addressing).
 */
const RUN_ID = `${Date.now().toString(36)}${process.pid.toString(36)}`;

/** The "already registered" account TC-09 and TC-21 need. Seeded, never assumed. */
const SEED_EMAIL = `fr01.seed.${RUN_ID}@example.com`;
const SEED_NAME = 'Seeded Existing User';
const SEED_PASSWORD = 'Password 123';

interface RegistrationCase extends TestCaseRow {
  level: 'ui' | 'api';
  name: string;
  email: string;
  password: string;
  /** `password-gate` marks a row that carries a gate-passing password on purpose. */
  bypass: '' | 'password-gate';
  /** For api rows: the JSON key to leave out of the request body. */
  omit_field: '' | 'name' | 'email' | 'password';
  expect_outcome: 'success' | 'rejected';
  expect_channel: 'native' | 'banner' | 'redirect' | 'api';
  /** HTTP status for api rows, target path for redirect rows, field name for banner rows. */
  expect_signal: string;
  note: string;
}

const cases = loadCsv<RegistrationCase>('fr01_registration.csv');

/**
 * A banner row states which field it is complaining about, and the message must name
 * that field - otherwise the user is told "something is wrong" and cannot act. Matching
 * on the field noun rather than on the app's exact sentence keeps the assertion tied to
 * the requirement instead of to the current wording.
 */
const FIELD_KEYWORD: Record<string, RegExp> = {
  name: /họ tên|tên/i,
  email: /email/i,
  password: /mật khẩu/i,
};

/**
 * A data file is edited far more often than this spec is, so a typo in it must fail
 * loudly here rather than quietly select a branch. Without this, `expect_channe1` or
 * `redriect` would fall through to the success path and could go green on a case that
 * was written to be refused.
 */
function keywordFor(field: string, tcId: string): RegExp {
  const keyword = FIELD_KEYWORD[field];
  expect(
    keyword,
    `${tcId}: expect_signal "${field}" is not a known field - fix the data file`,
  ).toBeDefined();
  return keyword;
}

function resolveEmail(raw: string, tcId: string): string {
  if (raw === '{{UNIQUE}}') return `fr01.${tcId.toLowerCase()}.${RUN_ID}@example.com`;
  if (raw === '{{EXISTING}}') return SEED_EMAIL;
  // Same address, different case - the point of OQ-09 is whether that is the same account.
  if (raw === '{{EXISTING_UPPER}}') return SEED_EMAIL.toUpperCase();
  return raw.replace('{{RUN}}', RUN_ID);
}

/** Is this row aimed at the seeded account? Those rows must not assert "nothing exists". */
function targetsSeededAccount(row: RegistrationCase): boolean {
  return row.email === '{{EXISTING}}' || row.email === '{{EXISTING_UPPER}}';
}

test.describe('FR-01 Account registration', () => {
  // `playwright` is worker-scoped, so it is usable here; the `request` fixture is not.
  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext();
    const seeded = await api.post(`${API_URL}/api/register`, {
      data: { name: SEED_NAME, email: SEED_EMAIL, password: SEED_PASSWORD },
      failOnStatusCode: false,
    });
    expect(
      seeded.ok(),
      `could not seed the existing account ${SEED_EMAIL} - ` +
        `${seeded.status()} ${await seeded.text()} - TC-09 and TC-21 have no baseline`,
    ).toBeTruthy();
    await api.dispose();
  });

  for (const row of cases) {
    test(caseTitle(row), async ({ page, request, registerPage }) => {
      const email = resolveEmail(row.email, row.tc_id);

      // Recorded in the report so a reader knows this row is not using the spec password.
      if (row.bypass === 'password-gate') {
        test.info().annotations.push({
          type: 'Data note',
          description:
            'carries a password that satisfies the client-side gate, so the case can ' +
            'reach the rule it was written for (see TC_Matrix_FR01.md, bypass column)',
        });
      }

      /* ---------- api rows: the form has no way to send these ---------- */
      if (row.level === 'api') {
        const payload: Record<string, string> = {
          name: row.name,
          email,
          password: row.password,
        };
        if (row.omit_field) delete payload[row.omit_field];

        const response = await request.post(`${API_URL}/api/register`, {
          data: payload,
          failOnStatusCode: false,
        });

        // Pattern 2 - contract assertion.
        if (row.expect_outcome === 'success') {
          await expectApiResponse(response, Number(row.expect_signal), (body) => {
            expect(body.id, 'a created account must come back with its identifier').toEqual(
              expect.any(Number),
            );
          });
        } else {
          // Soft, so a wrong status does not abort before the check below finds out
          // whether the account was created anyway. Both facts belong in the report.
          expect
            .soft(response.status(), `${response.url()} status`)
            .toBe(Number(row.expect_signal));

          // A refusal must also not *claim* an account was created. This one is
          // answerable from the response itself, so unlike the login probe below it
          // still applies to the rows that omit `email` or `password` - those rows
          // previously asserted nothing but the status code.
          const rejectedBody = (await response.json().catch(() => ({}))) as {
            id?: unknown;
          };
          expect
            .soft(
              rejectedBody.id,
              'the request was rejected, so the response must not return a created-account id',
            )
            .toBeUndefined();
        }

        // Pattern 3 - the status code is a claim; whether the row was written is the fact.
        // A 400 that inserts anyway, or a 200 that inserts nothing, both pass on status alone.
        if (row.omit_field === 'email' || row.omit_field === 'password') {
          // The response-level check above ("no created-account id") does cover these
          // rows. What is still not automated is whether a row was nevertheless written:
          // /api/login is keyed on e-mail and verifies the password, so a request that
          // omitted either one cannot be looked up afterwards, and this build exposes no
          // authenticated account-list endpoint to count against. Stated as an open gap
          // rather than closed with a weaker check - any claim that persistence was
          // verified for these two rows would have to come from manual database
          // inspection, which is not what this suite executes.
          test.info().annotations.push({
            type: 'Coverage gap',
            description:
              `omitting ${row.omit_field} leaves no automated way to observe whether a row was ` +
              'written; only the response contract is asserted for this row',
          });
        } else if (targetsSeededAccount(row)) {
          // The baseline account exists by design, so login cannot prove whether a
          // duplicate request inserted another row. Status + absence of a new id remain
          // enforceable; claiming that login must fail here would be a false assertion.
          test.info().annotations.push({
            type: 'Coverage gap',
            description:
              'the seeded account already exists, so login cannot distinguish rejection ' +
              'from a duplicate insert; response status and created id are asserted',
          });
        } else {
          const login = await request.post(`${API_URL}/api/login`, {
            data: { email, password: row.password },
            failOnStatusCode: false,
          });
          if (row.expect_outcome === 'success') {
            expect(login.status(), `${email} was reported created, so it must be usable`).toBe(200);
            const body = await login.json();
            expect(body.user?.email, 'the stored e-mail must be the one that was sent').toBe(email);
            expect(body.user?.name, 'the stored name must be the one that was sent').toBe(row.name);
          } else {
            expect(
              login.ok(),
              `the request was rejected, so ${email} must not have been written`,
            ).toBeFalsy();
          }
        }
        return;
      }

      /* ---------- ui rows ---------- */
      await registerPage.goto();
      await expect(registerPage.heading).toBeVisible();
      await registerPage.register({ name: row.name, email, password: row.password });

      switch (row.expect_channel) {
      case 'native': {
        // Pattern 1 - the browser's own constraint validation, not an app message.
        const empty = (['name', 'email', 'password'] as const).filter(
          (field) => (field === 'email' ? email : row[field]) === '',
        );
        expect(
          empty.length,
          'a native-validation row must leave at least one required field empty',
        ).toBeGreaterThan(0);

        const inputOf = {
          name: registerPage.nameInput,
          email: registerPage.emailInput,
          password: registerPage.passwordInput,
        };
        for (const field of empty) {
          const valid = await registerPage.isValid(inputOf[field]);
          // The message is browser-supplied and differs per engine, so it is never an
          // expected value - it is fetched only when the case is about to fail, purely
          // so the report says what the browser actually did.
          const reported = valid
            ? ` (browser reported: "${await registerPage.validationMessageOf(inputOf[field])}")`
            : '';
          expect(
            valid,
            `${field} is required, so the browser must refuse to submit the form${reported}`,
          ).toBe(false);
        }
        await expect(page).toHaveURL(/\/register$/);
        await expect(
          registerPage.errorBanner,
          'the form never reached the app, so it must not have rendered an app error',
        ).toBeHidden();
        return;
      }

      case 'banner': {
        // Pattern 1 - the user must be told what is wrong, and about which field.
        // Soft on purpose: when the app shows no banner at all, the interesting question
        // is what it did instead, and a hard failure here would abort before the check
        // below answers it. Soft failures still fail the test at the end.
        await expect
          .soft(
            registerPage.errorBanner,
            'registration was refused, so the reason must be shown to the user',
          )
          .toBeVisible();
        await expect
          .soft(
            registerPage.errorBanner,
            `the message must name the ${row.expect_signal} field, otherwise the user cannot act on it`,
          )
          .toHaveText(keywordFor(row.expect_signal, row.tc_id));
        await expect.soft(page).toHaveURL(/\/register$/);

        // Pattern 3 - a refused registration must not have written an account anyway.
        // Skipped for the two rows aimed at the seeded account, which exists by design.
        if (!targetsSeededAccount(row)) {
          const login = await request.post(`${API_URL}/api/login`, {
            data: { email, password: row.password },
            failOnStatusCode: false,
          });
          expect(
            login.ok(),
            `registration was refused, so ${email} must not be a usable account`,
          ).toBeFalsy();
        }
        return;
      }

      case 'redirect': {
        // Pattern 1 - the app's own success signal.
        await expect(page).toHaveURL(new RegExp(`${row.expect_signal}$`));
        // Not "the error banner is hidden": that element belongs to /register and cannot
        // exist here, so such a check could never fail. The falsifiable statement is that
        // the registration form itself is gone - if the app had stayed put and rendered an
        // error, its submit button would still be on screen.
        await expect(
          registerPage.submitButton,
          'the app claims the account was created, so the registration form must be gone',
        ).toBeHidden();

        // Pattern 3 - and the account must actually exist, with the data that was typed.
        // A redirect on its own proves navigation, not persistence.
        const login = await request.post(`${API_URL}/api/login`, {
          data: { email, password: row.password },
          failOnStatusCode: false,
        });
        expect(
          login.status(),
          `the UI reported success, so ${email} must be able to log in`,
        ).toBe(200);
        const body = await login.json();
        expect(body.user?.email, 'the stored email must be the one that was submitted').toBe(email);
        expect(body.user?.name, 'the stored name must be the one that was submitted').toBe(row.name);
        return;
      }

      default:
        // Reached only if the data file carries a channel this spec does not implement.
        // Failing here is the point: silently treating it as one of the known branches
        // could pass a case that was written to be refused.
        throw new Error(
          `${row.tc_id}: unknown expect_channel "${row.expect_channel}" - ` +
            'expected native, banner, redirect or api',
        );
      }
    });
  }
});
