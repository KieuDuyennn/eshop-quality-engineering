import type { Locator, Page, Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * FR-11 Order history view, user side (Pool B).
 *
 * The path is `/profile`, NOT `/orders`. `frontend-web/src/App.jsx` declares no
 * `/orders` route at all; the order history is a panel inside `Profile.jsx`.
 * HW02 recorded FR-11 as having no web UI because it searched for a route name
 * instead of the rendered feature - see TC_Matrix_FR11.md.
 *
 * Locators derived from `Profile.jsx` and then verified on the running page with
 * a throwaway probe, against a seeded account holding 16 orders across all five
 * statuses. The counts:
 *
 *   getByRole('heading', {name:'Lịch sử đơn hàng'}) -> 1
 *   getByRole('table')                             -> 1   (0 when there are no orders)
 *   getByRole('row')      [whole page]             -> 17  (16 + the header row)
 *   getByRole('columnheader')                      -> 5
 *   getByRole('rowgroup')                          -> 2   (thead + tbody)
 *   table >> tbody tr                              -> 16
 *   row.locator('span')   [the status badge]       -> 1 per row
 *   getByRole('button', {name:'Hủy đơn'})          -> 14  (absent on delivered + canceled)
 *   getByText('Bạn chưa có đơn hàng nào.')         -> 1   (on a zero-order account)
 *
 * Column order, read off the rendered page: Mã ĐH · Ngày đặt · Tổng tiền ·
 * Trạng thái · Thao tác.
 *
 * Four things the probe established that change how the assertions must be written:
 *
 *   1. `orders` starts as `[]` in Profile.jsx, so "Bạn chưa có đơn hàng nào."
 *      renders for a moment even for a user who HAS orders, until the fetch
 *      resolves. Asserting the empty state on a bare goto() can therefore pass
 *      spuriously. Use gotoAndWaitForOrders(), which waits for the actual
 *      /api/orders/my-orders response.
 *   2. Row lookup by order id must match the cell exactly. filter({hasText:'#1'})
 *      matched 8 rows once ids reached double digits (#1 and #10-#16); ids do
 *      reach double digits across repeated runs, so the substring form is a
 *      latent false pass. rowFor() uses exact text.
 *   3. Every order created in one run shares the same rendered date: created_at
 *      is a second-granularity SQLite CURRENT_TIMESTAMP and the cell uses
 *      toLocaleDateString(), which drops the time. 16 orders produced exactly 1
 *      distinct value in the date column, so newest-first CANNOT be asserted on
 *      that column. Assert on the Mã ĐH column instead - the backend sorts
 *      `ORDER BY id DESC` (server.js, /api/orders/my-orders), not by created_at.
 *   4. The backend's status machine only allows pending -> confirmed -> shipping
 *      -> delivered, so a `delivered` fixture needs three sequential admin calls.
 */
export class OrderHistoryPage extends BasePage {
  readonly path = '/profile';

  constructor(page: Page) { super(page); }

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Lịch sử đơn hàng' });
  }

  get table(): Locator { return this.page.getByRole('table'); }

  /**
   * CSS last resort: ARIA has no "body row" role - getByRole('row') returns the
   * header row too, and there is no accessible name on the row group to select
   * tbody by. Scoping to the table keeps it unambiguous (the page has exactly
   * one table).
   */
  get rows(): Locator { return this.table.locator('tbody tr'); }

  get emptyState(): Locator {
    return this.page.getByText('Bạn chưa có đơn hàng nào.');
  }

  /** Rendered instead of the whole panel when there is no session. */
  get notLoggedInMessage(): Locator {
    return this.page.getByText('Vui lòng đăng nhập');
  }

  get columnHeaders(): Locator { return this.page.getByRole('columnheader'); }

  /**
   * Navigates and waits for the order fetch to actually come back, so that an
   * assertion cannot run against the pre-fetch empty state (see note 1 above).
   * Returns the API payload, which lets a test compare what the API said with
   * what the table rendered - a data-integrity assertion rather than a second
   * UI assertion.
   */
  async gotoAndWaitForOrders(): Promise<Array<Record<string, unknown>>> {
    const responsePromise: Promise<Response> = this.page.waitForResponse(
      (r) => r.url().includes('/api/orders/my-orders'),
    );
    await this.goto();
    const response = await responsePromise;
    const body = await response.json();
    return Array.isArray(body) ? body : (body.orders ?? []);
  }

  /**
   * For the anonymous / bad-token cases: Profile.jsx never issues the request
   * when there is no usable session, so gotoAndWaitForOrders() would hang.
   */
  async gotoWithoutSession(): Promise<void> {
    await this.goto();
    await this.waitForReady();
  }

  /** Exact-match row lookup - see note 2 above on why hasText is unsafe here. */
  rowFor(orderId: number | string): Locator {
    return this.rows.filter({
      has: this.page.getByText(`#${orderId}`, { exact: true }),
    });
  }

  /**
   * CSS last resort: the status badge is a <span> with no role, no accessible
   * name and no test id. There is exactly one span per row, so scoping to the
   * row is enough to identify it without relying on a column index.
   */
  statusBadge(orderId: number | string): Locator {
    return this.rowFor(orderId).locator('span');
  }

  /** The Tailwind classes are the only expression of the colour requirement. */
  async badgeClassOf(orderId: number | string): Promise<string> {
    return (await this.statusBadge(orderId).getAttribute('class')) ?? '';
  }

  cancelButton(orderId: number | string): Locator {
    return this.rowFor(orderId).getByRole('button', { name: 'Hủy đơn' });
  }

  /**
   * One cell of one row.
   *
   * CSS last resort for the same reason as columnValues(): `getByRole('cell')`
   * would resolve to all five cells of the row with no accessible name to pick
   * one by, and the column headers are not programmatically associated with the
   * cells (`<th>` carries no scope attribute), so there is no ARIA route from a
   * header name to its column.
   *
   * @param column 1-based: 1 Mã ĐH · 2 Ngày đặt · 3 Tổng tiền · 4 Trạng thái · 5 Thao tác
   */
  cellOf(orderId: number | string, column: number): Locator {
    return this.rowFor(orderId).locator(`td:nth-child(${column})`);
  }

  /**
   * CSS last resort: reading one column means taking the nth cell of every row.
   * `rows.locator('td').nth(i)` does NOT do that - it flattens all cells across
   * all rows and returns a single element (the probe returned 1 value for a
   * 16-row table), so the nth-child form is required.
   *
   * @param column 1-based, matching the rendered order:
   *   1 Mã ĐH · 2 Ngày đặt · 3 Tổng tiền · 4 Trạng thái · 5 Thao tác
   */
  async columnValues(column: number): Promise<string[]> {
    const cells = await this.rows.locator(`td:nth-child(${column})`).allInnerTexts();
    return cells.map((text) => text.trim());
  }

  /** Order ids as numbers, for the ordering assertion. "#16" -> 16. */
  async orderIds(): Promise<number[]> {
    const values = await this.columnValues(1);
    return values.map((value) => Number(value.replace('#', '')));
  }

  async dateColumn(): Promise<string[]> { return this.columnValues(2); }
  async amountColumn(): Promise<string[]> { return this.columnValues(3); }
  async statusColumn(): Promise<string[]> { return this.columnValues(4); }
}
