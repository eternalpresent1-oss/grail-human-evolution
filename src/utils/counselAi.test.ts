import { CounselRequestError, counselErrorKey, requestCounselReply } from '@/utils/counselAi';

describe('counselErrorKey', () => {
  it('names a refused key and a rate limit instead of a generic network miss', () => {
    expect(counselErrorKey(401)).toBe('counsel.error.unauthorized');
    expect(counselErrorKey(403)).toBe('counsel.error.unauthorized');
    expect(counselErrorKey(429)).toBe('counsel.error.rate');
    expect(counselErrorKey(500)).toBe('counsel.error.network');
    expect(counselErrorKey(0)).toBe('counsel.error.network');
  });
});

describe('requestCounselReply', () => {
  it('refuses an empty key before it talks to the network', async () => {
    await expect(
      requestCounselReply({
        language: 'en',
        snapshot: 'octagon',
        thread: [],
        prompt: 'What now?',
      }),
    ).rejects.toMatchObject({
      name: 'CounselRequestError',
      key: 'counsel.error.nokey',
    } satisfies Partial<CounselRequestError>);
  });
});
