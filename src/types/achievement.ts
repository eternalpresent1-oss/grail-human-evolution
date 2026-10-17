export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly achievedOn: string;
}

export const MAX_ACHIEVEMENTS = 48;
export const ACHIEVEMENT_TITLE_MAX = 80;
export const ACHIEVEMENT_DETAIL_MAX = 80;
