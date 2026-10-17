import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

import type { Provider } from './store.ts';

export interface VerifiedIdentity {
  provider: Provider;
  subject: string;
  email: string | null;
}

export interface TokenCheck {
  jwks: JWTVerifyGetKey;
  issuer: string | readonly string[];
  audience: string | readonly string[];
  provider: Provider;
}

export async function verifyIdentityToken(token: string, check: TokenCheck): Promise<VerifiedIdentity> {
  const { payload } = await jwtVerify(token, check.jwks, {
    issuer: check.issuer as string | string[],
    audience: check.audience as string | string[],
  });
  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 255) {
    throw new Error('missing subject');
  }
  const email = typeof payload.email === 'string' && payload.email.length <= 320 ? payload.email : null;
  return { provider: check.provider, subject: payload.sub, email };
}

export function appleCheck(audience: string): TokenCheck {
  return {
    provider: 'apple',
    audience,
    issuer: 'https://appleid.apple.com',
    jwks: createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys')),
  };
}

export function googleCheck(audience: readonly string[]): TokenCheck {
  return {
    provider: 'google',
    audience,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwks: createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),
  };
}

export { createLocalJWKSet };
