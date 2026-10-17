import { DRIVE_LINE_MAX, sanitizeDriveLine } from '@/utils/driveLine';

describe('sanitizeDriveLine', () => {
  it('trims, collapses space and caps length', () => {
    expect(sanitizeDriveLine('  долг   перед  своими  ')).toBe('долг перед своими');
    expect(sanitizeDriveLine(null)).toBe('');
    expect(sanitizeDriveLine('x'.repeat(DRIVE_LINE_MAX + 40))).toHaveLength(DRIVE_LINE_MAX);
  });
});
