import { apiBaseUrl, currentAccountSession } from '@/api/accountSession';
import { googleSignInConfigured } from '@/config/googleAuth';

/** Store builds and preview wire an API URL — sign-in is required for sync and billing. */
export function accountSignInRequired(): boolean {
  return apiBaseUrl().length > 0 && googleSignInConfigured();
}

export function needsAccountSignIn(session: ReturnType<typeof currentAccountSession> = currentAccountSession()): boolean {
  return accountSignInRequired() && session === null;
}
