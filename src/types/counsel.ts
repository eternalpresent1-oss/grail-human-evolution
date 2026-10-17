export type CounselRole = 'user' | 'assistant';

export interface CounselMessage {
  readonly id: string;
  readonly role: CounselRole;
  readonly text: string;
}

export const MAX_COUNSEL_MESSAGES = 40;
export const COUNSEL_MESSAGE_MAX = 800;
