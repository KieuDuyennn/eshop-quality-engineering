import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * FR-01 Account registration (Pool A).
 *
 * Locators below were derived by reading `frontend-web/src/pages/Register.jsx`,
 * not by guessing. Three facts about that page drive every choice here:
 *
 *   1. The form has exactly three fields - Ho Ten, Email, Mat khau - and no
 *      Confirm Password field. TC-17 and TC-23 are unautomatable for that reason
 *      (see docs/test-plan/TC_Matrix_FR01.md).
 *   2. Each <label> carries no htmlFor and each <input> carries no id or
 *      aria-label, so getByLabel matches nothing and the two text inputs share
 *      no accessible name. This is why the field getters fall to CSS.
 *   3. Errors render into a single <div> bound to one string, with no role, so
 *      BasePage.toast (getByRole('alert')) does not match. Hence errorBanner.
 *
 * Verified against the running page (http://localhost:5173/register) with a
 * throwaway probe before any spec was written: each getter below resolved to
 * exactly one element, the three field getters accepted three different values,
 * getByLabel resolved to 0, getByRole('textbox') resolved to 3, and the form
 * contains 3 inputs in total - so the missing Confirm Password field is a fact
 * about the running app, not an inference from the source.
 */
export class RegisterPage extends BasePage {
  readonly path = '/register';

  constructor(page: Page) { super(page); }

  /**
   * CSS last resort: the label is a plain sibling of the input with no htmlFor,
   * and neither input has an id, aria-label or accessible name, so getByLabel
   * and getByRole cannot tell the two text boxes apart. Anchoring on the label's
   * own text keeps this stable against field reordering, unlike an nth-child.
   */
  private field(label: string): Locator {
    return this.page.locator(`form div:has(> label:text-is("${label}")) input`);
  }

  get nameInput(): Locator { return this.field('Họ Tên'); }
  get emailInput(): Locator { return this.field('Email'); }
  get passwordInput(): Locator { return this.field('Mật khẩu'); }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Đăng Ký' });
  }

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Đăng Ký Tài Khoản' });
  }

  /**
   * CSS last resort: the error container has no role, no test id and no stable
   * text of its own - its only distinguishing feature is the red styling it is
   * rendered with. Prefer errorText(...) in assertions; this getter exists for
   * "no error is shown" checks where there is no text to match on.
   */
  get errorBanner(): Locator {
    return this.page.locator('div.bg-red-100');
  }

  /** Assert on the message itself rather than on the container that holds it. */
  errorText(expected: string | RegExp): Locator {
    return this.page.getByText(expected);
  }

  /**
   * All three inputs are `required`, so an empty field is blocked by the browser
   * before the app renders anything. Those cases have to read the native
   * constraint-validation state instead of errorBanner.
   *
   * Assert on isValid(), not on this string: the message is supplied by the
   * browser, so it differs across the three required projects (Chromium returned
   * "Please fill out this field."). Use it for reporting, not as an expected value.
   */
  async validationMessageOf(input: Locator): Promise<string> {
    return input.evaluate((el) => (el as HTMLInputElement).validationMessage);
  }

  async isValid(input: Locator): Promise<boolean> {
    return input.evaluate((el) => (el as HTMLInputElement).checkValidity());
  }

  /**
   * Fills only the fields present in `data`, so a case can omit one to leave it
   * empty. There is no confirmPassword parameter - the page has no such field.
   */
  async register(data: { name?: string; email?: string; password?: string }): Promise<void> {
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.password !== undefined) await this.passwordInput.fill(data.password);
    await this.submitButton.click();
  }
}
