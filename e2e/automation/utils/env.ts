import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Central `.env` loader. **Import this before anything that reads `process.env`.**
 *
 * Why it exists: the README told the student to copy `.env.example` to `.env`, but
 * nothing in the project ever loaded that file. `playwright.config.ts`, the specs and
 * `run-all-browsers.ps1` all read `process.env` directly, so in a normal shell
 * USER_EMAIL, USER_PASSWORD, ADMIN_EMAIL and ADMIN_PASSWORD were simply absent and
 * every FR-11 case would have been blocked at its guard. `--list` still reported 40
 * tests because collection does not run hooks, so the gap was invisible until a real
 * run. See finding 26 in docs/test-plan/AI_Review_Gap_Analysis.md.
 *
 * Why a module rather than a `loadDotenv()` call inside `playwright.config.ts`: ES
 * module imports are evaluated before any statement in the importing module, so a
 * `loadDotenv()` line in the config body runs *after* every module the config imports
 * has already read `process.env`. Making the load a module that others import turns the
 * ordering into a dependency the module graph has to honour, instead of a line whose
 * position happens to work.
 *
 * Nothing here prints a value. `envReadiness()` reports presence as booleans only, so a
 * report or a console log can prove the environment is loaded without leaking a
 * password into attributable evidence.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * `override: false` - a variable already set in the shell wins over the file. That is
 * what lets CI inject credentials without editing a gitignored file, and it means
 * `USER_EMAIL=x npx playwright test` behaves the way anyone would expect.
 */
loadDotenv({ path: path.join(ROOT, '.env'), override: false, quiet: true });

function required(name: string): string {
  return process.env[name] ?? '';
}

/** Front-end under test. NOT the API - they are different ports on this SUT. */
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
export const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:5174';
export const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export const USER_EMAIL = required('USER_EMAIL');
export const USER_PASSWORD = required('USER_PASSWORD');
export const ADMIN_EMAIL = required('ADMIN_EMAIL');
export const ADMIN_PASSWORD = required('ADMIN_PASSWORD');

/**
 * The SUT's own JWT signing key, needed only by FR-13 API-07 to mint a token that is
 * correctly signed but already expired - a code path in `jwt.verify` that a malformed
 * token does not reach.
 *
 * This is not a credential of the student's and not a secret of any real system: it is
 * a constant published in the SUT's source (`backend/server.js:10`). It still lives in
 * `.env` rather than in a tracked file, because "the value is public" is a judgement
 * that can change, and the project rule is that key material does not enter Git. The
 * case that needs it fails with a clear setup message when it is unset, rather than
 * silently skipping.
 */
export const SUT_JWT_SECRET = required('SUT_JWT_SECRET');

/** The four credentials FR-11 and FR-13 cannot run without. */
const CREDENTIAL_KEYS = ['USER_EMAIL', 'USER_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'] as const;

/** Presence only, never values - safe to print and safe to put in a report. */
export function envReadiness(): Record<string, boolean> {
  const readiness: Record<string, boolean> = {
    'BASE_URL set': Boolean(process.env.BASE_URL),
    'API_URL set': Boolean(process.env.API_URL),
  };
  for (const key of CREDENTIAL_KEYS) {
    readiness[`${key} set`] = Boolean(process.env[key]);
  }
  return readiness;
}

export function missingCredentials(): string[] {
  return CREDENTIAL_KEYS.filter((key) => !process.env[key]);
}

/**
 * Throws naming exactly what is missing. Used by the suites that need a login, so a
 * misconfigured environment fails with an instruction rather than with 40 identical
 * "login failed" errors that look like a broken SUT.
 */
export function assertCredentialsPresent(feature: string): void {
  const missing = missingCredentials();
  if (missing.length > 0) {
    throw new Error(
      `${feature} needs ${missing.join(', ')}, which ${missing.length === 1 ? 'is' : 'are'} ` +
      `not set. Copy .env.example to .env and fill it in (.env is gitignored). ` +
      `Loaded .env from: ${path.join(ROOT, '.env')}`,
    );
  }
}
