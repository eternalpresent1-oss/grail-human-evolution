import { createArcheClient, type ArcheClient } from '@/api/archeClient';
import { apiBaseUrl, currentAccountSession } from '@/api/accountSession';

export type AccessBlock = 'premium' | 'limit';

/** Free taste that may run without a signed-in server session. */
const OPEN_WITHOUT_SERVER = new Set([
  'canon',
  'survey',
  'breath',
  'analysis_canon',
]);

/**
 * Store / closed-test builds set `EXPO_PUBLIC_ENFORCE_ACCESS=1`.
 * Preview and local stay open so product testing is not locked by Premium.
 */
export function accessEnforced(): boolean {
  return process.env.EXPO_PUBLIC_ENFORCE_ACCESS === '1';
}

export function isOpenWithoutServer(feature: string): boolean {
  return OPEN_WITHOUT_SERVER.has(feature);
}

export async function readAccess(
  client: ArcheClient,
  token: string,
  feature: string,
  day: string,
): Promise<AccessBlock | null> {
  const verdict = await client.access(token, feature, day);
  if (verdict.allowed) {
    return null;
  }
  return verdict.reason === 'limit' ? 'limit' : 'premium';
}

export async function accessBlockNow(feature: string, day: string): Promise<AccessBlock | null> {
  // Preview / dev: do not ask the server to lock Premium features.
  if (!accessEnforced()) {
    return null;
  }
  const session = currentAccountSession();
  const base = apiBaseUrl();
  if (session === null || base.length === 0) {
    if (!isOpenWithoutServer(feature)) {
      return 'premium';
    }
    return null;
  }
  return readAccess(createArcheClient(base), session.token, feature, day);
}

export function analysisReadingOpen(block: AccessBlock | null): boolean {
  return block === null;
}

export function runIfAllowed(
  feature: string,
  day: string,
  apply: () => void,
  block: (reason: AccessBlock) => void,
): void {
  // Preview / dev: signed-in users must still be able to test the full product
  // until Play Billing (phase 4) and store builds with ENFORCE_ACCESS.
  if (!accessEnforced()) {
    apply();
    return;
  }
  const session = currentAccountSession();
  const base = apiBaseUrl();
  if (session === null || base.length === 0) {
    if (!isOpenWithoutServer(feature)) {
      block('premium');
      return;
    }
    apply();
    return;
  }
  void readAccess(createArcheClient(base), session.token, feature, day).then((reason) => {
    if (reason === null) {
      apply();
      return;
    }
    block(reason);
  });
}
