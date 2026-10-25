/**
 * Google OAuth clients for Sign in with Google (Android first).
 * webClientId is required by the native SDK to return an idToken the server can verify.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  '252716351253-f6cnkf6fb6t0iqasp86t4mb3qf9quocd.apps.googleusercontent.com';

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ||
  '252716351253-7293braai24odmjli6i7k4ccbncdu6ju.apps.googleusercontent.com';

export function googleSignInConfigured(): boolean {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}
