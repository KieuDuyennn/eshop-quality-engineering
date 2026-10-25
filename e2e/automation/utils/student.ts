// Side-effect import, and it must stay first: this is what loads `.env` before the
// reads below happen. See automation/utils/env.ts for why the load lives in a module
// instead of in a call at the top of playwright.config.ts.
import './env';

/**
 * Single source of truth for the run identity that the brief requires to be
 * visible in every HTML report ("Run by: {StudentID}" + an ISO timestamp).
 *
 * Section 11 (Anti-AI-Cheat) treats these reports as attributable execution
 * evidence, so nothing here may be edited after a run to make a report look
 * better than the run that produced it.
 */

export const STUDENT_ID = process.env.STUDENT_ID ?? '23127184';
export const STUDENT_NAME = process.env.STUDENT_NAME ?? 'Le Pham Kieu Duyen';

/** ISO-8601 timestamp captured once, when the Playwright process boots. */
export const RUN_STAMP = new Date().toISOString();

/** `fr01` | `fr11` | `fr13` - selects the report output folder. */
export const FEATURE = process.env.FEATURE ?? 'all';

/** `chromium` | `firefox` | `webkit` - selects the report output folder. */
export const BROWSER_TAG = process.env.BROWSER ?? 'all';

/** The exact string the TA looks for in the report. */
export const RUN_BY_LABEL = `Run by: ${STUDENT_ID}`;
