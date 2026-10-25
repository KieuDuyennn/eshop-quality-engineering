import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

/**
 * Data-driven support (brief section 6, Task 1: "The test data must be stored in a
 * separate .csv or .json file - hardcoded inline arrays or objects in the script
 * are not accepted"). Files live in `automation/data/`.
 *
 * Every spec must get its cases through one of these two loaders. If you find
 * yourself writing a literal array of cases inside a `.spec.ts`, that is the
 * thing the brief rejects.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');

/** Shape every data row is expected to share, so specs can title themselves. */
export interface TestCaseRow {
  /** Stable ID traced back to the HW02 test-design artifact, e.g. `FR01-TC-03`. */
  tc_id: string;
  /** One-line intent, used as the Playwright test title. */
  title: string;
  /** `positive` | `negative` | `edge` - all three count toward the 12 minimum. */
  type: string;
  [key: string]: unknown;
}

/**
 * Load a CSV data file from `data/`. Empty strings stay empty strings - they are
 * meaningful test input (an empty required field), so they are never coerced.
 *
 * `trim` is deliberately OFF. With it on, a whitespace-only value - which FR-01
 * TC-18 exists specifically to send - would arrive at the test as `''`, silently
 * turning an "is blank treated as empty?" case into a duplicate of the empty-field
 * case, and passing for the wrong reason. The cost is that the data files must not
 * pad their commas; that is a formatting rule, not a data rule.
 */
export function loadCsv<T extends TestCaseRow = TestCaseRow>(fileName: string): T[] {
  const raw = readFileSync(path.join(DATA_DIR, fileName), 'utf8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: false,
    bom: true,
  }) as T[];
}

/** Load a JSON data file from `data/`. */
export function loadJson<T = unknown>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, fileName), 'utf8')) as T;
}

/** Convenience: `FR01-TC-03 [negative] reject password shorter than 8 chars`. */
export function caseTitle(row: TestCaseRow): string {
  return `${row.tc_id} [${row.type}] ${row.title}`;
}
