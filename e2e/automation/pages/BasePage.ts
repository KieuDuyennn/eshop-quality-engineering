import type { Page, Locator } from '@playwright/test';

/**
 * Base for all page objects.
 *
 * Selector policy for this project - the AI review in Task 1 is largely about
 * this, so it is written down rather than left implicit:
 *   1st choice  getByRole / getByLabel  (accessible, survives restyling)
 *   2nd choice  getByTestId             (stable if the SUT ships test ids)
 *   3rd choice  getByText               (breaks on i18n - EShop is Vietnamese)
 *   last resort CSS/XPath by class      (this is the "fragile selector" smell)
 *
 * Any locator that falls to the last resort must carry a one-line comment saying
 * why nothing better was available. Those comments become evidence in
 * `docs/test-plan/AI_Review_Gap_Analysis.md`.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Page path relative to baseURL, e.g. `/register`. */
  abstract readonly path: string;

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  /** A toast/banner the SUT uses for global success or error messages. */
  get toast(): Locator {
    return this.page.getByRole('alert').first();
  }

  /** Wait for the app to be idle enough to assert on - prefer this over sleeps. */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}
