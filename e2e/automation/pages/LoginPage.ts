import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login - not a feature under test, but FR-11 and FR-13 both need an
 * authenticated session, so it lives in the shared page objects.
 *
 * Locators below were derived from `frontend-web/src/pages/Login.jsx` and then
 * verified on the running page (http://localhost:5173/login) with a throwaway
 * probe. The counts that justify each choice, rather than a claim that they
 * were "checked":
 *
 *   getByLabel(/email/i)                      -> 0
 *   getByLabel('Username')                    -> 0
 *   getByLabel('Mật khẩu')                    -> 0
 *   getByPlaceholder(match-anything)          -> 0  (no input has a placeholder)
 *   getByTestId('email')                      -> 0
 *   locator('input[type=password]')           -> 0
 *   getByRole('button', {name:/login|đăng nhập/i}) -> 0
 *   getByRole('textbox')                      -> 2  (both fields, no way to separate)
 *   locator('input')                          -> 2  (structural: the whole form)
 *   form div:has(> label:text-is("Username")) input -> 1
 *   form div:has(> label:text-is("Mật khẩu")) input -> 1
 *   getByRole('button', {name:'Sign In'})     -> 1
 *
 * A fill smoke test confirmed the two field getters address different elements
 * (they held "test@eshop.com" and "Test1234!" simultaneously).
 *
 * Three facts about this page that the tests have to work around:
 *
 *   1. Every <label> lacks htmlFor and every <input> lacks id, name, placeholder
 *      and aria-label, so getByLabel cannot bind and the two text boxes share no
 *      accessible name. This is why the field getters fall to CSS.
 *   2. The field labelled "Username" is submitted as `email` (Login.jsx binds it
 *      to the `email` state and posts it as `email`). The label is the app's
 *      wording; `emailInput` is named for what the field actually is.
 *   3. Both inputs are type="text" - including the password field - so the
 *      password is rendered in clear text and `input[type=password]` matches
 *      nothing. Reported as an observation; the verdict is the student's.
 *
 * The session lives in localStorage under the key "token" (AuthContext.jsx), so
 * the token helpers below manipulate that key rather than cookies.
 */
export class LoginPage extends BasePage {
  readonly path = '/login';

  constructor(page: Page) { super(page); }

  /**
   * CSS last resort: the label is a plain sibling of the input with no htmlFor,
   * and neither input carries an id, name, placeholder or aria-label, so
   * getByLabel resolves to 0 and getByRole('textbox') resolves to 2 with no
   * accessible name to separate them. Anchoring on the label's own text keeps
   * this stable against field reordering, unlike an nth-child or .nth(0).
   */
  private field(label: string): Locator {
    return this.page.locator(`form div:has(> label:text-is("${label}")) input`);
  }

  /** Labelled "Username" on screen, but posted as `email`. See note 2 above. */
  get emailInput(): Locator { return this.field('Username'); }

  get passwordInput(): Locator { return this.field('Mật khẩu'); }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign In' });
  }

  /**
   * CSS last resort: the failure message container has no role, no test id and
   * no text of its own until a failure occurs - its only stable feature is the
   * red styling. Prefer errorText() when there is a message to match on.
   */
  get errorBanner(): Locator {
    return this.page.locator('div.bg-red-100');
  }

  errorText(expected: string | RegExp): Locator {
    return this.page.getByText(expected);
  }

  /** Logs in and waits for the app to leave /login. Login.jsx navigates to '/'. */
  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL((url) => !url.pathname.includes('/login'));
  }

  /**
   * For negative cases: submits and returns without waiting for navigation,
   * because a rejected login stays on /login. Waiting here would time out and
   * report as an infrastructure error instead of the assertion doing the work.
   */
  async loginExpectingFailure(email: string, password: string): Promise<void> {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Puts an arbitrary token into the session without going through the form.
   * Needed for the malformed / expired-token cases: there is no UI path that
   * produces a bad token, so it has to be injected. AuthContext reads
   * localStorage["token"] on mount, so stage the value before the next navigation.
   *
   * `addInitScript` is deliberate: the previous implementation first opened `/`,
   * then wrote localStorage. Besides making the app mount once with the wrong auth
   * state, that extra page load consumed requests from the SUT-wide 200 request / 15
   * minute limiter. FR-11 does not test login, so its setup should not drive the login
   * UI or load an unrelated page.
   */
  async injectToken(token: string): Promise<void> {
    await this.page.addInitScript((t) => localStorage.setItem('token', t), token);
  }

  /** Ensures the next navigation starts without a session. */
  async clearSession(): Promise<void> {
    await this.page.addInitScript(() => localStorage.removeItem('token'));
  }
}
