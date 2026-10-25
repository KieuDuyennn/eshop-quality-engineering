import { expect, type Page, type Locator, type APIResponse } from '@playwright/test';

/**
 * The brief (section 6, Task 1) requires "at least three distinct assertion
 * patterns". The three below are genuinely different kinds of check, not three
 * spellings of the same one - keep them distinct when you extend this file:
 *
 *   Pattern 1 - UI state / web-first assertion  (what the user can see)
 *   Pattern 2 - API / contract assertion        (what the server actually returned)
 *   Pattern 3 - data-integrity assertion        (what the rendered data means)
 *
 * A fourth, `expectVisualBaseline`, is available if you want a snapshot pattern,
 * but note it is brittle across the three browsers - read the note on it first.
 */

/* ------------------------------------------------------------------ *
 * Pattern 1 - UI state assertion (auto-retrying, no manual waits)
 * ------------------------------------------------------------------ */

/** Assert an element is visible and its text matches, retrying until timeout. */
export async function expectVisibleWithText(
  locator: Locator,
  expected: string | RegExp,
): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toHaveText(expected);
}

/** Assert a validation/error message is surfaced to the user for a given field. */
export async function expectFieldError(
  page: Page,
  fieldName: string,
  expected: string | RegExp,
): Promise<void> {
  const message = page.getByTestId(`error-${fieldName}`)
    .or(page.locator(`[data-field="${fieldName}"] .error-message`))
    .first();
  await expect(message, `expected an inline error on "${fieldName}"`).toBeVisible();
  await expect(message).toContainText(expected);
}

/* ------------------------------------------------------------------ *
 * Pattern 2 - API / contract assertion
 * ------------------------------------------------------------------ */

/** Assert the backend agreed with the UI: status code plus a JSON body predicate. */
export async function expectApiResponse(
  response: APIResponse,
  expectedStatus: number,
  bodyPredicate?: (body: any) => void,
): Promise<void> {
  expect(response.status(), `${response.url()} status`).toBe(expectedStatus);
  if (bodyPredicate) {
    bodyPredicate(await response.json());
  }
}

/**
 * Assert the UI outcome and the network outcome agree. This is the pattern that
 * catches the "form says success, server said 400" class of defect - exactly the
 * kind an AI-generated script that only checks the toast will miss.
 */
export async function expectUiAndApiAgree(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>,
  expectedStatus: number,
): Promise<void> {
  const waitForResponse = page.waitForResponse(urlPattern);
  await action();
  const response = await waitForResponse;
  expect(response.status(), `network status for ${response.url()}`).toBe(expectedStatus);
}

/**
 * Assert a response's status is one of an allowed set.
 *
 * A set, not a single value, for the cases where the requirement is "this must be
 * refused" but the exact denial code is an unresolved open question - FR-11's
 * OQ-06, OQ-07, OQ-12 and OQ-13 all sit there. Asserting membership keeps the
 * requirement falsifiable (a 200 still fails) without inventing a precision the
 * design never had. Do NOT widen a set to make a red case green: that turns this
 * helper into the "made it pass" category the workflow forbids.
 */
export async function expectStatusAmong(
  response: APIResponse,
  allowed: number[],
  label: string,
  options: { soft?: boolean } = {},
): Promise<void> {
  const status = response.status();
  const body = await response.text();
  const message =
    `${label}: ${response.url()} answered ${status}, ` +
    `expected one of [${allowed.join(', ')}]. Body: ${body.slice(0, 300)}`;

  // `soft` for the cases that have a follow-up mutation or disclosure check: a hard
  // assertion throws on the unexpected status and the report then never learns whether
  // the refused request changed anything. Soft failures still fail the test.
  if (options.soft) {
    expect.soft(allowed, message).toContain(status);
  } else {
    expect(allowed, message).toContain(status);
  }
}

/* ------------------------------------------------------------------ *
 * Pattern 3 - data-integrity assertion
 * ------------------------------------------------------------------ */

/**
 * Assert a numeric column is sorted descending.
 *
 * FR-11 needs this rather than the date variant below: the order-history date
 * cell uses `toLocaleDateString()`, which drops the time, and `created_at` has
 * only second granularity - 16 orders seeded in one run rendered exactly ONE
 * distinct date string, so the date column cannot witness ordering at all. The
 * backend sorts `ORDER BY id DESC`, so the Mã ĐH column is the only honest
 * witness. Verified by probe, not assumed.
 */
export function expectSortedDescByNumber(values: number[], label: string): void {
  expect(
    values.every(Number.isFinite),
    `${label}: not all values are numeric - ${JSON.stringify(values)}`,
  ).toBe(true);
  const sorted = [...values].sort((a, b) => b - a);
  expect(values, `${label}: not sorted newest-first`).toEqual(sorted);
}

/** Assert a table/list is sorted descending by a date column (FR-11 order history). */
export async function expectSortedDescByDate(values: string[]): Promise<void> {
  const timestamps = values.map((v) => Date.parse(v));
  expect(timestamps.every(Number.isFinite), `unparseable dates: ${values.join(', ')}`).toBe(true);
  const sorted = [...timestamps].sort((a, b) => b - a);
  expect(timestamps, 'list is not sorted newest-first').toEqual(sorted);
}

/** Assert a rendered money/count figure equals an independently computed total. */
export function expectFigureMatches(
  rendered: string,
  expectedValue: number,
  label: string,
): void {
  const parsed = Number(rendered.replace(/[^\d.-]/g, ''));
  expect(Number.isFinite(parsed), `${label}: "${rendered}" is not numeric`).toBe(true);
  expect(parsed, `${label} mismatch`).toBeCloseTo(expectedValue, 2);
}

/* ------------------------------------------------------------------ *
 * Optional pattern 4 - visual baseline
 * ------------------------------------------------------------------ *
 * Font rendering differs between Chromium, Firefox and WebKit, so a single
 * baseline will fail on 2 of the 3 required browsers. If you use this, commit
 * one baseline PER project and say so in the main report - do not raise the
 * resulting diffs as SUT bugs.
 */
export async function expectVisualBaseline(page: Page, name: string): Promise<void> {
  await expect(page).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.02 });
}
