// Side-effect import, and it must stay first: this is what loads `.env` before the
// reads below happen. See automation/utils/env.ts for why the load lives in a module
// instead of in a call at the top of playwright.config.ts.
import './env';

/**
 * Single source of truth for the run identity shown in every HTML report
 * (feature, browser and an ISO timestamp).
 */

/** ISO-8601 timestamp captured once, when the Playwright process boots. */
export const RUN_STAMP = new Date().toISOString();

/** `fr01` | `fr11` | `fr13` - selects the report output folder. */
export const FEATURE = process.env.FEATURE ?? 'all';

/** `chromium` | `firefox` | `webkit` - selects the report output folder. */
export const BROWSER_TAG = process.env.BROWSER ?? 'all';
