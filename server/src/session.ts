import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

export function newSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function bearerToken(header: string | undefined): string | null {
  if (header === undefined) {
    return null;
  }
  const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(header);
  const token = match?.[1];
  return token === undefined || token.length < TOKEN_BYTES ? null : token;
}
