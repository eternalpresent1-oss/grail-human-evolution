export const QUESTION_LIMIT = 50;
export const VECTOR_LIMIT = 10;

const OPEN_FEATURES = ['canon', 'survey', 'breath', 'analysis_canon'] as const;
const PREMIUM_FEATURES = [
  'custom_atom',
  'goal',
  'talent',
  'achievement',
  'grail_card',
  'custom_signal',
  'career_boundary',
  'analysis_full',
  'shadow_retract',
] as const;

export type AccessFeature =
  | (typeof OPEN_FEATURES)[number]
  | (typeof PREMIUM_FEATURES)[number]
  | 'shadow_mark'
  | 'life_vector'
  | 'counsel_question'
  | 'vector_refresh';

export type AccessReason = 'ok' | 'premium' | 'limit';
export type AccessSpend = 'none' | 'question' | 'vector' | 'free_life';

export interface AccessInput {
  feature: AccessFeature;
  premium: boolean;
  shadowMarks: number;
  hasLifeVector: boolean;
  freeLifeVectorUsed: boolean;
  questions: number;
  vectorRefreshes: number;
}

export interface AccessDecision {
  allowed: boolean;
  reason: AccessReason;
  spend: AccessSpend;
}

export function parseFeature(value: unknown): AccessFeature | null {
  if (typeof value !== 'string') {
    return null;
  }
  if ((OPEN_FEATURES as readonly string[]).includes(value) || (PREMIUM_FEATURES as readonly string[]).includes(value)) {
    return value as AccessFeature;
  }
  if (value === 'shadow_mark' || value === 'life_vector' || value === 'counsel_question' || value === 'vector_refresh') {
    return value;
  }
  return null;
}

export function isPremiumActive(status: string, periodEnd: Date | null, now: Date): boolean {
  if (status !== 'active') {
    return false;
  }
  return periodEnd === null || periodEnd.getTime() > now.getTime();
}

export function decideAccess(input: AccessInput): AccessDecision {
  if ((OPEN_FEATURES as readonly string[]).includes(input.feature)) {
    return allow('none');
  }
  if (input.feature === 'shadow_mark') {
    if (input.shadowMarks < 1 || input.premium) {
      return allow('none');
    }
    return deny('premium');
  }
  if (input.feature === 'life_vector') {
    if (!input.hasLifeVector && !input.freeLifeVectorUsed) {
      return allow('free_life');
    }
    if (!input.premium) {
      return deny('premium');
    }
    if (input.vectorRefreshes >= VECTOR_LIMIT) {
      return deny('limit');
    }
    return allow('vector');
  }
  if (input.feature === 'counsel_question') {
    if (!input.premium) {
      return deny('premium');
    }
    if (input.questions >= QUESTION_LIMIT) {
      return deny('limit');
    }
    return allow('question');
  }
  if (input.feature === 'vector_refresh') {
    if (!input.premium) {
      return deny('premium');
    }
    if (input.vectorRefreshes >= VECTOR_LIMIT) {
      return deny('limit');
    }
    return allow('vector');
  }
  return input.premium ? allow('none') : deny('premium');
}

export function countShadowMarks(payload: Record<string, unknown> | null): number {
  const events = payload?.shadowEvents;
  return Array.isArray(events) ? events.length : 0;
}

export function hasLifeVectorReading(payload: Record<string, unknown> | null): boolean {
  const reading = payload?.lifeVectorReading;
  return typeof reading === 'string' && reading.length > 0;
}

function allow(spend: AccessSpend): AccessDecision {
  return { allowed: true, reason: 'ok', spend };
}

function deny(reason: Exclude<AccessReason, 'ok'>): AccessDecision {
  return { allowed: false, reason, spend: 'none' };
}
