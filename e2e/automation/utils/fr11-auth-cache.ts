import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Per-Playwright-run auth state for FR-11.
 *
 * A failing test makes Playwright discard its worker and start another one. Therefore
 * `beforeAll` is not once per browser run: it runs again after every red case. The SUT
 * has a global 200-request limiter, so authentication must live above worker lifetime.
 * globalSetup writes this OS-temp file once; every replacement worker reads it; and
 * globalTeardown removes it. It is outside the repo and never appears in a report.
 */
export interface Fr11AuthState {
  ownerToken: string;
  adminToken: string;
  otherToken: string;
  emptyToken: string;
}

export const FR11_AUTH_CACHE = path.join(os.tmpdir(), 'hw04-fr11-auth-state.json');

export function writeFr11AuthState(state: Fr11AuthState): void {
  writeFileSync(FR11_AUTH_CACHE, JSON.stringify(state), { encoding: 'utf8', mode: 0o600 });
}

export function readFr11AuthState(): Fr11AuthState {
  try {
    return JSON.parse(readFileSync(FR11_AUTH_CACHE, 'utf8')) as Fr11AuthState;
  } catch (error) {
    throw new Error(
      `FR-11 auth cache is unavailable at ${FR11_AUTH_CACHE}. ` +
      `Run through playwright.config.ts so globalSetup can create it. Cause: ` +
      `${(error as Error).message}`,
    );
  }
}

export function removeFr11AuthState(): void {
  rmSync(FR11_AUTH_CACHE, { force: true });
}
