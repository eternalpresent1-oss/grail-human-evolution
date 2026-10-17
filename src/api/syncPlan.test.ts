import { payloadForServer, payloadFromServer, planSync } from '@/api/syncPlan';

describe('sync plan', () => {
  it('sends the phone copy when both sides are still empty', () => {
    expect(planSync(0, 0)).toEqual({ action: 'push', revision: 1 });
  });

  it('keeps the newer side', () => {
    expect(planSync(2, 5)).toEqual({ action: 'pull' });
    expect(planSync(5, 2)).toEqual({ action: 'push', revision: 5 });
    expect(planSync(3, 3)).toEqual({ action: 'keep' });
  });

  it('does not send the model key or the photo address', () => {
    const payload = payloadForServer({
      profile: { disciplineScore: 80 },
      tasks: [],
      aiApiKey: 'secret',
      proofBackgroundUri: 'file://photo',
    });
    expect(payload).toEqual({ profile: { disciplineScore: 80 }, tasks: [] });
  });

  it('keeps the photo on the phone when the server copy arrives', () => {
    const next = payloadFromServer(
      { profile: { disciplineScore: 10 }, tasks: [], proofBackgroundUri: 'file://photo', aiApiKey: '' },
      { profile: { disciplineScore: 80 }, tasks: [{ id: 'a' }] },
    );
    expect(next).toEqual({
      profile: { disciplineScore: 80 },
      tasks: [{ id: 'a' }],
      proofBackgroundUri: 'file://photo',
      aiApiKey: '',
    });
  });
});
