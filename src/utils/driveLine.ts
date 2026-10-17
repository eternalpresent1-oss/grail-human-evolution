/** One line the essence writes. Not a scale and not a catalog. */
export const DRIVE_LINE_MAX = 160;

export function sanitizeDriveLine(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, DRIVE_LINE_MAX);
}
