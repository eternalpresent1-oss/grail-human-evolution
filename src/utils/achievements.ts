import {
  ACHIEVEMENT_DETAIL_MAX,
  ACHIEVEMENT_TITLE_MAX,
  MAX_ACHIEVEMENTS,
  type Achievement,
} from '@/types/achievement';
import { isIsoDateKey } from '@/utils/taskTime';

export function appendGoalAchievement(
  achievements: readonly Achievement[],
  title: string,
  id: string,
  achievedOn: string,
): readonly Achievement[] {
  const clean = sanitizeAchievementTitle(title);
  if (clean.length === 0 || achievements.length >= MAX_ACHIEVEMENTS) {
    return achievements;
  }

  return [
    ...achievements,
    {
      id,
      title: clean,
      detail: '',
      achievedOn,
    },
  ];
}

export function sanitizeAchievementTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, ACHIEVEMENT_TITLE_MAX);
}

export function sanitizeAchievementDetail(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, ACHIEVEMENT_DETAIL_MAX);
}

export function sanitizeAchievements(value: unknown): readonly Achievement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: Achievement[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') {
      continue;
    }

    const raw = entry as {
      readonly id?: unknown;
      readonly title?: unknown;
      readonly detail?: unknown;
      readonly achievedOn?: unknown;
    };

    if (typeof raw.id !== 'string' || seen.has(raw.id) || typeof raw.title !== 'string') {
      continue;
    }

    const title = sanitizeAchievementTitle(raw.title);
    if (title.length === 0) {
      continue;
    }

    if (typeof raw.achievedOn !== 'string' || !isIsoDateKey(raw.achievedOn)) {
      continue;
    }

    seen.add(raw.id);
    items.push({
      id: raw.id,
      title,
      detail: typeof raw.detail === 'string' ? sanitizeAchievementDetail(raw.detail) : '',
      achievedOn: raw.achievedOn,
    });

    if (items.length >= MAX_ACHIEVEMENTS) {
      break;
    }
  }

  return items;
}
