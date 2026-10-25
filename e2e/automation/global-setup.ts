import { request as playwrightRequest, type FullConfig } from '@playwright/test';
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD, assertCredentialsPresent,
} from './utils/env';
import * as api from './utils/eshop-api';
import { removeFr11AuthState, writeFr11AuthState } from './utils/fr11-auth-cache';

const GENERATED_PASSWORD = 'Test1234!';

/** Authenticate FR-11 identities once, above Playwright worker lifetime. */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const feature = process.env.FEATURE ?? 'all';
  if (feature !== 'fr11' && feature !== 'all') return;

  assertCredentialsPresent('FR-11 global setup');
  removeFr11AuthState();

  const request = await playwrightRequest.newContext();
  try {
    const ownerToken = await api.login(request, USER_EMAIL, USER_PASSWORD);
    const adminToken = await api.login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const runId = `${Date.now().toString(36)}${process.pid.toString(36)}`;
    const otherEmail = `fr11.other.${runId}@example.com`;
    const emptyEmail = `fr11.empty.${runId}@example.com`;

    await api.register(request, {
      name: 'FR11 Other User', email: otherEmail, password: GENERATED_PASSWORD,
    });
    await api.register(request, {
      name: 'FR11 Empty User', email: emptyEmail, password: GENERATED_PASSWORD,
    });

    writeFr11AuthState({
      ownerToken,
      adminToken,
      otherToken: await api.login(request, otherEmail, GENERATED_PASSWORD),
      emptyToken: await api.login(request, emptyEmail, GENERATED_PASSWORD),
    });
  } finally {
    await request.dispose();
  }
}
