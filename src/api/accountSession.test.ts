import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  apiBaseUrl,
  currentAccountSession,
  rememberAccountSession,
  resetAccountSessionMemory,
  restoreAccountSession,
} from '@/api/accountSession';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

describe('account session', () => {
  beforeEach(() => {
    resetAccountSessionMemory();
    jest.clearAllMocks();
  });

  it('keeps the session across restore from storage', async () => {
    rememberAccountSession({
      token: 'session-token-session-token-session',
      userId: 'user-1',
      provider: 'google',
      revision: 2,
    });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const raw = String((AsyncStorage.setItem as jest.Mock).mock.calls[0]?.[1]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(raw);
    resetAccountSessionMemory();
    await expect(restoreAccountSession()).resolves.toEqual({
      token: 'session-token-session-token-session',
      userId: 'user-1',
      provider: 'google',
      revision: 2,
    });
    expect(currentAccountSession()?.userId).toBe('user-1');
  });

  it('clears storage on sign-out', () => {
    rememberAccountSession({
      token: 'session-token-session-token-session',
      userId: 'user-1',
      provider: 'apple',
      revision: 0,
    });
    rememberAccountSession(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
    expect(currentAccountSession()).toBeNull();
  });

  it('reads an empty API URL as unsigned mode', () => {
    expect(apiBaseUrl()).toBe('');
  });
});
