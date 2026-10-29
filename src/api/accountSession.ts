import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { AccountSession } from '@/api/archeClient';

const SESSION_KEY = 'grail-account-session';

let current: AccountSession | null = null;
let restoreStarted = false;
let version = 0;
const listeners = new Set<() => void>();

function notify(): void {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAccountSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccountSessionVersion(): number {
  return version;
}

export function currentAccountSession(): AccountSession | null {
  return current;
}

/** Reactive session for layouts that must leave the app when signed out. */
export function useAccountSession(): AccountSession | null {
  useSyncExternalStore(subscribeAccountSession, getAccountSessionVersion, getAccountSessionVersion);
  return current;
}

export function rememberAccountSession(next: AccountSession | null): void {
  current = next;
  notify();
  if (next === null) {
    void AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  void AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

export async function restoreAccountSession(): Promise<AccountSession | null> {
  if (restoreStarted && current !== null) {
    return current;
  }
  restoreStarted = true;
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (raw === null || raw.length === 0) {
      current = null;
      notify();
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    const session = readSession(parsed);
    current = session;
    notify();
    return session;
  } catch {
    current = null;
    notify();
    return null;
  }
}

/** Test helper: clear memory without touching storage writers mid-test. */
export function resetAccountSessionMemory(): void {
  current = null;
  restoreStarted = false;
  notify();
}

export function apiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  return typeof value === 'string' ? value.trim() : '';
}

function readSession(value: unknown): AccountSession | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const token = record.token;
  const userId = record.userId;
  const provider = record.provider;
  const revision = record.revision;
  if (typeof token !== 'string' || token.length === 0) {
    return null;
  }
  if (typeof userId !== 'string' || userId.length === 0) {
    return null;
  }
  if (provider !== 'apple' && provider !== 'google') {
    return null;
  }
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) {
    return null;
  }
  return { token, userId, provider, revision };
}
