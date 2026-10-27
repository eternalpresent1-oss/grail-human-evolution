import { connectAccount } from '@/api/accountFlow';
import {
  apiBaseUrl,
  currentAccountSession,
  rememberAccountSession,
} from '@/api/accountSession';
import { createArcheClient } from '@/api/archeClient';
import { requestGoogleIdToken, signOutGoogle } from '@/api/googleSignIn';
import { payloadForServer } from '@/api/syncPlan';
import { googleSignInConfigured } from '@/config/googleAuth';
import { useGrailStore } from '@/store/useGrailStore';

export type GoogleConnectResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'cancelled' | 'failed' };

/** Google idToken → Arche session + optional snapshot merge. */
export async function connectGoogleAccount(): Promise<GoogleConnectResult> {
  const baseUrl = apiBaseUrl();
  if (baseUrl.length === 0 || !googleSignInConfigured()) {
    return { ok: false, reason: 'unavailable' };
  }

  const tokenResult = await requestGoogleIdToken();
  if (!tokenResult.ok) {
    return { ok: false, reason: tokenResult.reason };
  }

  try {
    const local = useGrailStore.getState();
    const localRevision = currentAccountSession()?.revision ?? 0;
    const connected = await connectAccount(
      createArcheClient(baseUrl),
      'google',
      tokenResult.idToken,
      localRevision,
      payloadForServer(local as unknown as Record<string, unknown>),
    );
    rememberAccountSession(connected.session);
    if (connected.nextState !== null) {
      useGrailStore.setState(connected.nextState as Partial<typeof local>);
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export async function clearGoogleAccountSession(token: string | null): Promise<void> {
  const baseUrl = apiBaseUrl();
  if (baseUrl.length > 0 && token !== null) {
    await createArcheClient(baseUrl).signOut(token).catch(() => undefined);
  }
  await signOutGoogle();
  rememberAccountSession(null);
}
