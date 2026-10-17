import { createArcheClient, type ArcheClient } from '@/api/archeClient';
import { apiBaseUrl, currentAccountSession } from '@/api/accountSession';

export type AccessBlock = 'premium' | 'limit';

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
  const session = currentAccountSession();
  const base = apiBaseUrl();
  if (session === null || base.length === 0) {
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
  const session = currentAccountSession();
  const base = apiBaseUrl();
  if (session === null || base.length === 0) {
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
