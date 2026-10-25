import type { Dialog, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * FR-13 Dashboard, admin side (Pool C).
 *
 * This page object was rewritten from the scaffold after reading
 * `frontend-admin/src/App.jsx` and probing the running app on all three engines.
 * Six of the scaffold's assumptions were wrong; they are recorded here because
 * each one would have produced a locator that matches nothing.
 *
 * WHAT THE ADMIN APP ACTUALLY IS
 *
 * A single-file React SPA. There is no router and no `react-router-dom` import:
 * the whole UI is `App.jsx`, and the section is chosen by a `useState`
 * (`activeTab`) whose initial value is `"dashboard"`. So:
 *
 *   - `/admin/dashboard` (the scaffold's path) is NOT a route. The dashboard is
 *     the landing view at the app root.
 *   - The app lives on its OWN origin, :5174, while `playwright.config.ts` sets
 *     baseURL to the customer app on :5173. `path` is therefore an ABSOLUTE URL -
 *     a relative path here would silently navigate to the wrong application.
 *   - It renders its own inline login form when there is no token, so
 *     `LoginPage` (written against :5173) does not apply to this feature.
 *
 * PROBE COUNTS - login screen (identical on chromium / firefox / webkit)
 *
 *   getByRole('heading', {name:'Admin Login'})       -> 1
 *   getByRole('textbox', {name:'Email'})             -> 1
 *   getByRole('textbox', {name:'Password'})          -> 1
 *   getByRole('button',  {name:'Login'})             -> 1
 *   getByLabel(/email/i)                             -> 0   <- rejected
 *   getByLabel(/password|mật khẩu/i)                 -> 0   <- rejected
 *   getByTestId('email')                             -> 0   <- rejected
 *   [structural] form input                          -> 2   (only two fields exist)
 *   [structural] input[type=password]                -> 1
 *   fill smoke test: the two getters hold different values, so they address
 *   different elements ("probe-a@x.com" / "probe-b").
 *
 * The inputs carry no `<label>`, no id, no name and no test id - `getByLabel`
 * cannot bind them. `getByRole` still works because an input's `placeholder`
 * supplies its accessible name when nothing better exists, which is why the
 * role-based locators are used here rather than dropping to `getByPlaceholder`
 * or CSS. Note `getByRole('textbox', {name:'Password'})` resolves the password
 * field even though `input[type=password]` has no ARIA textbox role in the HTML
 * spec: Playwright computes roles itself, so this is stable across all three
 * engines by construction (verified: 1 on each).
 *
 * PROBE COUNTS - dashboard, logged in as admin (identical on all three engines)
 *
 *   getByRole('heading', {name:'Tổng doanh thu (Delivered)'}) -> 1
 *   getByRole('heading', {name:'Tổng số đơn hàng'})           -> 1
 *   getByRole('heading', {name:'Dashboard'})                  -> 1
 *   getByRole('listitem').filter({hasText:'Dashboard'})       -> 1
 *   heading >> xpath=following-sibling::p[1]                  -> 1  (the KPI value)
 *   getByRole('region')                                       -> 0   <- rejected
 *   getByTestId('kpi-value')                                  -> 0   <- rejected
 *   getByText('Dashboard')                                    -> 2   <- ambiguous
 *
 * WHAT IS ABSENT - the scaffold had getters for all four; they are deleted, not
 * left dead, because a case cannot be written against a control that does not
 * exist. Verified by structural count, not by assumption:
 *
 *   - a users KPI card: getByRole('heading', {name:/người dùng/i}) in the main
 *     panel -> 0. The dashboard renders exactly TWO cards, revenue and order
 *     count. ("Người dùng" exists only as a sidebar tab.)
 *   - a date-range filter: getByLabel(/date range|khoảng thời gian/i) -> 0, and
 *     `main select, main input` -> 0. The dashboard tab has no control at all,
 *     so a `date_range` case is not automatable against this build.
 *   - a recent-orders table: `table` on the dashboard tab -> 0.
 *
 * THREE THINGS THAT CHANGE HOW THE ASSERTIONS MUST BE WRITTEN
 *
 * 1. Failure is reported by `alert()`, not by an in-page element. `handleLogin`
 *    calls `alert(...)` and returns. Playwright auto-dismisses dialogs when no
 *    handler is registered, so a negative case that does not install one sees
 *    only "still on the login form" and cannot tell WHY. `attemptLogin()`
 *    captures the message. Probed on all three engines:
 *      role=user       -> alert "Bạn không phải là admin!", token stays null
 *      wrong password  -> alert "Đăng nhập thất bại"
 *      unknown email   -> alert "Đăng nhập thất bại"
 *      empty both      -> alert "Đăng nhập thất bại"
 *      valid admin     -> no dialog, dashboard renders, adminToken set
 *    These strings come from the app, not from the browser, so they are safe to
 *    assert on (contrast the native constraint-validation messages in FR-01).
 *
 * 2. The admin gate is CLIENT-SIDE ONLY. `handleLogin` checks
 *    `res.data.user.role !== "admin"` in the browser; the backend's
 *    `authenticateToken` (server.js:118-128) verifies the JWT and never reads
 *    `role`. Probed against the live API with a `test@eshop.com` token:
 *      GET /api/admin/orders -> 200,  GET /api/admin/users -> 200
 *    So a UI-only access-control case PASSES while the same check at the API
 *    layer does not. FR-13 needs both, or it will report the gate as working.
 *
 * 3. The KPI value is locale-formatted by the BROWSER. `App.jsx` renders
 *    `{totalRevenue.toLocaleString()} ₫` with no explicit locale, so the
 *    thousands separator comes from the browser, not the app - probed as
 *    "8,000,000 ₫" with navigator.language "en-US" on all three engines.
 *    `revenueNumber()` therefore strips every non-digit rather than parsing the
 *    string as a number: under a locale that groups with "." (de-DE), a naive
 *    Number() reads "8.000.000" as 8.
 */
export class AdminDashboardPage extends BasePage {
  /**
   * Absolute on purpose - the admin app is a different origin from baseURL.
   * See the note at the top of this file.
   */
  readonly path = process.env.ADMIN_URL ?? 'http://localhost:5174';

  constructor(page: Page) { super(page); }

  /* ---------------- login form (rendered when there is no token) ------------- */

  get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Admin Login' });
  }

  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Email' });
  }

  get passwordInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login' });
  }

  /* ---------------- dashboard ----------------------------------------------- */

  get dashboardHeading(): Locator {
    // getByText('Dashboard') matches 2 (this h2 + the sidebar tab); the role
    // narrows it to the panel heading.
    return this.page.getByRole('heading', { name: 'Dashboard' });
  }

  get revenueLabel(): Locator {
    return this.page.getByRole('heading', { name: 'Tổng doanh thu (Delivered)' });
  }

  get orderCountLabel(): Locator {
    return this.page.getByRole('heading', { name: 'Tổng số đơn hàng' });
  }

  /**
   * XPath last resort: a KPI card is `<div><h3>label</h3><p>value</p></div>`
   * with no role, no accessible name and no test id on either the card or the
   * value, so the value can only be addressed through its label. Anchoring on
   * the label's accessible name keeps the card identified semantically and uses
   * the axis purely to step from label to value (probe: 1 match).
   */
  private valueFor(label: Locator): Locator {
    return label.locator('xpath=following-sibling::p[1]');
  }

  get revenueValue(): Locator { return this.valueFor(this.revenueLabel); }
  get orderCountValue(): Locator { return this.valueFor(this.orderCountLabel); }

  /** Sidebar navigation; the `<li>`s are click handlers, not links or buttons. */
  sidebarTab(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: name });
  }

  get logoutTab(): Locator { return this.sidebarTab('Đăng xuất'); }

  /* ---------------- actions -------------------------------------------------- */

  /**
   * Fills and submits the admin login form, capturing any `alert()` the app
   * raises, and returns once the outcome has settled - either the dashboard
   * rendered or a dialog was shown. No fixed wait: it races the two real
   * signals against each other.
   */
  async attemptLogin(
    email: string,
    password: string,
  ): Promise<{ dialogs: string[]; reachedDashboard: boolean }> {
    const dialogs: string[] = [];
    let markDialogSeen: () => void = () => {};
    const firstDialog = new Promise<void>((resolve) => { markDialogSeen = resolve; });

    const onDialog = async (dialog: Dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
      markDialogSeen();
    };
    this.page.on('dialog', onDialog);

    try {
      await this.emailInput.fill(email);
      await this.passwordInput.fill(password);

      const loginResponse = this.page
        .waitForResponse((r) => r.url().includes('/api/login'))
        .catch(() => undefined);
      await this.loginButton.click();
      await loginResponse;

      // Whichever happens is the answer; swallow the loser's timeout so it
      // cannot surface as an unhandled rejection after the test moves on.
      await Promise.race([
        firstDialog,
        this.dashboardHeading.waitFor({ state: 'visible' }).catch(() => undefined),
      ]);
    } finally {
      this.page.off('dialog', onDialog);
    }

    return { dialogs, reachedDashboard: await this.dashboardHeading.isVisible() };
  }

  /** Navigate to the admin app and sign in; for the cases that need a session. */
  async gotoAndLogin(email: string, password: string) {
    await this.goto();
    return this.attemptLogin(email, password);
  }

  /**
   * The dashboard only has data once `fetchData()` resolves. Waiting on the
   * orders response - the source the revenue KPI is derived from - avoids
   * asserting against the pre-fetch render, where `orders` is still `[]` and
   * both KPIs legitimately read 0.
   */
  async gotoAndLoadDashboard(email: string, password: string): Promise<Array<Record<string, unknown>>> {
    await this.goto();
    const ordersResponse = this.page.waitForResponse(
      (r) => r.url().includes('/api/admin/orders') && r.request().method() === 'GET',
    );
    await this.attemptLogin(email, password);
    const body = await (await ordersResponse).json();
    return Array.isArray(body) ? body : (body.data ?? []);
  }

  /**
   * Opens an already-authenticated dashboard without exercising `/api/login`.
   * Most FR-13 rows test aggregation or authorization, not the login endpoint; using
   * the form in every row exhausted the SUT's global login limiter and turned 34
   * Chromium cases into identical 429 setup failures. The dedicated login rows still
   * use `attemptLogin()` and therefore continue to test the real form.
   */
  async gotoWithTokenAndLoadDashboard(token: string): Promise<Array<Record<string, unknown>>> {
    await this.goto();
    await this.injectToken(token);
    const ordersResponse = this.page.waitForResponse(
      (r) => r.url().includes('/api/admin/orders') && r.request().method() === 'GET',
    );
    await this.page.reload();
    const body = await (await ordersResponse).json();
    return Array.isArray(body) ? body : (body.data ?? []);
  }

  /**
   * Re-reads the dashboard after the order set has been changed by a fixture.
   * `fetchData()` runs only when the token changes, so seeding an order does
   * NOT update the KPIs on its own - without this the "delta" cases would
   * measure the same pre-seed figure twice and pass no matter what.
   *
   * A reload keeps the token (it lives in localStorage), so the login form does
   * not reappear and `attemptLogin` must not be called again.
   */
  async reloadAndWaitForOrders(): Promise<void> {
    const ordersResponse = this.page.waitForResponse(
      (r) => r.url().includes('/api/admin/orders') && r.request().method() === 'GET',
    );
    await this.page.reload();
    await ordersResponse;
  }

  /**
   * Puts a token straight into localStorage under the key the app reads,
   * bypassing the login form. This is how the access-control cases test the
   * gate the UI cannot test through its own form: `handleLogin` is the only
   * place the admin role is checked, so a token that never passes through it
   * exercises whatever protection the app has left. Must be called on the
   * app's origin, i.e. after goto().
   */
  async injectToken(token: string): Promise<void> {
    await this.page.evaluate((t) => localStorage.setItem('adminToken', t), token);
  }

  async clearSession(): Promise<void> {
    await this.page.evaluate(() => localStorage.removeItem('adminToken'));
  }

  /* ---------------- rendered values ------------------------------------------ */

  /**
   * Strips the currency symbol and the thousands separators, keeping the sign
   * and the decimal point. The separator is browser-supplied (see note 3), so
   * the raw string must never be handed to Number() as-is: "8,000,000 ₫" is
   * NaN, and a bare /\D/ strip would turn "0.02" into 2 and "-2" into 2.
   *
   * This assumes en-US-style grouping ("," groups, "." decimal), which the
   * probe confirmed on all three engines. It is a real dependency: under a
   * locale that groups with "." (de-DE), "8.000.000" would parse as 8. If the
   * suite ever runs under another locale, pin `locale: 'en-US'` in
   * `playwright.config.ts` rather than making this parser cleverer.
   */
  private static toNumber(rendered: string): number {
    const cleaned = rendered.replace(/[^\d.-]/g, '');
    return cleaned === '' ? Number.NaN : Number(cleaned);
  }

  async revenueNumber(): Promise<number> {
    return AdminDashboardPage.toNumber(await this.revenueValue.innerText());
  }

  async orderCountNumber(): Promise<number> {
    return AdminDashboardPage.toNumber(await this.orderCountValue.innerText());
  }
}
