import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

export function isExpoGo(): boolean {
  return isRunningInExpoGo();
}

/**
 * Local clocks need a native notifications backend. Expo Go on Android throws
 * the moment `expo-notifications` is evaluated, so that module must stay
 * unloaded here. Web has no local schedule either.
 */
export function canScheduleMethodSignals(): boolean {
  return Platform.OS !== 'web' && !isRunningInExpoGo();
}
