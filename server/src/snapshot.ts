const MAX_PAYLOAD_BYTES = 1_048_576;
const STRIPPED_KEYS = ['aiApiKey', 'proofBackgroundUri'] as const;

export interface StoredSnapshot {
  revision: number;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export type SnapshotDecision =
  | { kind: 'saved'; snapshot: StoredSnapshot }
  | { kind: 'unchanged'; snapshot: StoredSnapshot }
  | { kind: 'conflict'; snapshot: StoredSnapshot };

export function preparePayload(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const payload: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if ((STRIPPED_KEYS as readonly string[]).includes(key)) {
      continue;
    }
    payload[key] = entry;
  }
  if (Buffer.byteLength(JSON.stringify(payload)) > MAX_PAYLOAD_BYTES) {
    return null;
  }
  return payload;
}

export function decideSnapshot(
  current: StoredSnapshot | null,
  revision: number,
  payload: Record<string, unknown>,
  now: Date,
): SnapshotDecision | null {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    return null;
  }
  if (current === null) {
    return { kind: 'saved', snapshot: stamp(revision, payload, now) };
  }
  if (revision < current.revision) {
    return { kind: 'conflict', snapshot: current };
  }
  if (revision === current.revision) {
    return { kind: 'unchanged', snapshot: current };
  }
  return { kind: 'saved', snapshot: stamp(revision, payload, now) };
}

function stamp(revision: number, payload: Record<string, unknown>, now: Date): StoredSnapshot {
  return { revision, payload, updatedAt: now.toISOString() };
}
