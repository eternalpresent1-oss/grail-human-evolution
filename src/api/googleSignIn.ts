import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID, googleSignInConfigured } from '@/config/googleAuth';

let configured = false;

function ensureConfigured(): void {
  if (configured) {
    return;
  }
  if (!googleSignInConfigured()) {
    throw new Error('google_not_configured');
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

export type GoogleIdTokenResult =
  | { readonly ok: true; readonly idToken: string }
  | { readonly ok: false; readonly reason: 'cancelled' | 'unavailable' | 'failed' };

/** Opens the Google account picker and returns an idToken for `/v1/auth/google`. */
export async function requestGoogleIdToken(): Promise<GoogleIdTokenResult> {
  try {
    ensureConfigured();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) {
      return { ok: false, reason: 'cancelled' };
    }
    if (!isSuccessResponse(response)) {
      return { ok: false, reason: 'failed' };
    }
    const idToken = response.data.idToken;
    if (idToken === null || idToken.length === 0) {
      const tokens = await GoogleSignin.getTokens();
      if (tokens.idToken.length === 0) {
        return { ok: false, reason: 'failed' };
      }
      return { ok: true, idToken: tokens.idToken };
    }
    return { ok: true, idToken };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { ok: false, reason: 'cancelled' };
    }
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: false, reason: 'failed' };
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Local session clear still proceeds.
  }
}
