import { isHumanDimensionId, type AtomizedTask, type HumanDimensionId } from '@/types/grail';
import {
  CAMPAIGN_TITLE_MAX,
  HORIZON_MONTHS_MAX,
  HORIZON_MONTHS_MIN,
  MAX_SUPPORTING_VECTORS,
  isCampaignAdviceId,
  isCampaignStatus,
  type Campaign,
  type CampaignAdviceId,
} from '@/types/campaign';
import { calendarDaysBetween, isIsoDateKey } from '@/utils/taskTime';

export function sanitizeCampaigns(value: unknown): readonly Campaign[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleaned: Campaign[] = [];
  let hasActive = false;

  for (const candidate of value) {
    const campaign = sanitizeCampaign(candidate);
    if (campaign === null) {
      continue;
    }

    if (campaign.status === 'active') {
      if (hasActive) {
        cleaned.push({ ...campaign, status: 'reserve' });
        continue;
      }

      hasActive = true;
    }

    cleaned.push(campaign);
  }

  return cleaned;
}

function sanitizeCampaign(value: unknown): Campaign | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const raw = value as {
    readonly id?: unknown;
    readonly title?: unknown;
    readonly horizonMonths?: unknown;
    readonly startedOn?: unknown;
    readonly status?: unknown;
    readonly primary?: unknown;
    readonly supporting?: unknown;
    readonly vectorsConfirmed?: unknown;
    readonly created?: unknown;
    readonly takenAdviceIds?: unknown;
  };

  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    return null;
  }

  if (typeof raw.title !== 'string') {
    return null;
  }

  const title = raw.title.trim().slice(0, CAMPAIGN_TITLE_MAX);
  if (title.length === 0) {
    return null;
  }

  if (typeof raw.horizonMonths !== 'number' || !Number.isInteger(raw.horizonMonths)) {
    return null;
  }

  const horizonMonths = Math.min(
    HORIZON_MONTHS_MAX,
    Math.max(HORIZON_MONTHS_MIN, raw.horizonMonths),
  );

  if (typeof raw.startedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.startedOn)) {
    return null;
  }

  if (typeof raw.status !== 'string' || !isCampaignStatus(raw.status)) {
    return null;
  }

  if (typeof raw.primary !== 'string' || !isHumanDimensionId(raw.primary)) {
    return null;
  }

  const supporting = sanitizeSupporting(raw.supporting, raw.primary);
  const takenAdviceIds = sanitizeTaken(raw.takenAdviceIds);

  return {
    id: raw.id,
    title,
    horizonMonths,
    startedOn: raw.startedOn,
    status: raw.status,
    primary: raw.primary,
    supporting,
    vectorsConfirmed: raw.vectorsConfirmed === true,
    created: raw.created === true,
    takenAdviceIds,
  };
}

function sanitizeSupporting(value: unknown, primary: HumanDimensionId): readonly HumanDimensionId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const next: HumanDimensionId[] = [];

  for (const candidate of value) {
    if (typeof candidate !== 'string' || !isHumanDimensionId(candidate)) {
      continue;
    }

    if (candidate === primary || next.includes(candidate)) {
      continue;
    }

    next.push(candidate);
    if (next.length >= MAX_SUPPORTING_VECTORS) {
      break;
    }
  }

  return next;
}

function sanitizeTaken(value: unknown): readonly CampaignAdviceId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const next: CampaignAdviceId[] = [];

  for (const candidate of value) {
    if (typeof candidate !== 'string' || !isCampaignAdviceId(candidate)) {
      continue;
    }

    if (!next.includes(candidate)) {
      next.push(candidate);
    }
  }

  return next;
}

export function countPendingCampaignAtoms(
  tasks: readonly AtomizedTask[],
  campaignId: string,
): number {
  let count = 0;

  for (const task of tasks) {
    if (
      task.kind === 'campaign' &&
      task.campaignId === campaignId &&
      task.ritualState === 'pending'
    ) {
      count += 1;
    }
  }

  return count;
}

/**
 * Pulls every atom this campaign put on the desk. Pending, burned and absorbed
 * all leave: the goal no longer owns a place in the day.
 */
export function partitionCampaignAtoms(
  tasks: readonly AtomizedTask[],
  campaignId: string,
): {
  readonly kept: readonly AtomizedTask[];
  readonly absorbed: readonly AtomizedTask[];
} {
  const kept: AtomizedTask[] = [];
  const absorbed: AtomizedTask[] = [];

  for (const task of tasks) {
    if (task.kind === 'campaign' && task.campaignId === campaignId) {
      if (task.ritualState === 'absorbed') {
        absorbed.push(task);
      }
      continue;
    }

    kept.push(task);
  }

  return { kept, absorbed };
}

export function campaignMonthsLeft(campaign: Campaign, asOf: string): number {
  const elapsedDays = Math.max(0, calendarDaysBetween(campaign.startedOn, asOf));
  const remainingDays = campaign.horizonMonths * 30 - elapsedDays;
  return Math.max(0, Math.ceil(remainingDays / 30));
}

export interface CampaignCountdown {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly ended: boolean;
}

function addCalendarMonths(start: Date, months: number): Date {
  const year = start.getFullYear();
  const month = start.getMonth() + months;
  const day = start.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), 23, 59, 59, 999);
}

export function campaignDeadline(campaign: Campaign): Date | null {
  if (!isIsoDateKey(campaign.startedOn)) {
    return null;
  }

  const [yearToken, monthToken, dayToken] = campaign.startedOn.split('-');
  const year = Number(yearToken);
  const month = Number(monthToken);
  const day = Number(dayToken);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    start.getFullYear() !== year ||
    start.getMonth() !== month - 1 ||
    start.getDate() !== day
  ) {
    return null;
  }

  return addCalendarMonths(start, campaign.horizonMonths);
}

export function campaignCountdown(
  campaign: Campaign,
  now: Date = new Date(),
): CampaignCountdown {
  const deadline = campaignDeadline(campaign);
  if (deadline === null) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  }

  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  }

  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    ended: false,
  };
}

export function horizonFromYearsMonths(years: number, months: number): number | null {
  if (!Number.isInteger(years) || !Number.isInteger(months) || years < 0 || months < 0) {
    return null;
  }

  const total = years * 12 + months;
  if (total < HORIZON_MONTHS_MIN || total > HORIZON_MONTHS_MAX) {
    return null;
  }

  return total;
}

export function toggleSupporting(
  selected: readonly HumanDimensionId[],
  id: HumanDimensionId,
  primary: HumanDimensionId,
): readonly HumanDimensionId[] {
  if (id === primary) {
    return selected;
  }

  if (selected.includes(id)) {
    return selected.filter((item) => item !== id);
  }

  if (selected.length >= MAX_SUPPORTING_VECTORS) {
    return selected;
  }

  return [...selected, id];
}

export function sanitizeCampaignTitle(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, CAMPAIGN_TITLE_MAX);
}

export function seatActiveCampaign(
  campaigns: readonly Campaign[],
  incoming: Campaign,
): readonly Campaign[] {
  if (campaigns.some((campaign) => campaign.status === 'active')) {
    return campaigns;
  }

  return [...campaigns, incoming];
}

export function mapCampaign(
  campaigns: readonly Campaign[],
  campaignId: string,
  mapper: (campaign: Campaign) => Campaign,
): readonly Campaign[] {
  return campaigns.map((campaign) => (campaign.id === campaignId ? mapper(campaign) : campaign));
}
