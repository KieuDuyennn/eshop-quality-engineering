import { type FullConfig } from '@playwright/test';
import { removeFr11AuthState } from './utils/fr11-auth-cache';

export default function globalTeardown(_config: FullConfig): void {
  const feature = process.env.FEATURE ?? 'all';
  if (feature === 'fr11' || feature === 'all') removeFr11AuthState();
}
