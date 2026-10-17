import { Platform } from 'react-native';

import { type Translator } from '@/i18n';
import { useGrailStore } from '@/store/useGrailStore';
import { planAtomNotifications } from '@/utils/atomNotifications';
import { nextDailyFireAt, planMethodSignals } from '@/utils/methodSignals';
import { canScheduleMethodSignals } from '@/utils/runtimeEnv';

const ANDROID_CHANNEL = 'grail-method-3';
const SIGNAL_SOUND = 'signal.mp3';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null = null;
let handlerReady = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!canScheduleMethodSignals()) {
    return null;
  }

  if (cached !== null) {
    return cached;
  }

  try {
    cached = await import('expo-notifications');
    return cached;
  } catch {
    return null;
  }
}

function ensureHandler(Notifications: NotificationsModule): void {
  if (handlerReady || Platform.OS === 'web') {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerReady = true;
}

async function cancelKnown(
  Notifications: NotificationsModule,
  identifiers: readonly string[],
): Promise<void> {
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined),
    ),
  );
}

async function cancelLegacyAndOwned(Notifications: NotificationsModule): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const owned = scheduled
    .map((item) => item.identifier)
    .filter(
      (identifier) =>
        identifier.startsWith('grail-method-') || identifier.startsWith('grail-atom-'),
    );
  await cancelKnown(Notifications, owned);
}

export async function ensureMethodNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (Notifications === null) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const asked = await Notifications.requestPermissionsAsync();
  return (
    asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

function notificationContent(title: string, body: string): {
  title: string;
  body: string;
  sound: string;
  data: { screen: string };
  channelId?: string;
} {
  return {
    title,
    body,
    sound: SIGNAL_SOUND,
    data: { screen: 'atomizer' },
    ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
  };
}

async function scheduleOne(
  Notifications: NotificationsModule,
  item: { identifier: string; fireAt: Date; title: string; body: string },
): Promise<void> {
  const content = notificationContent(item.title, item.body);
  const channelId = Platform.OS === 'android' ? ANDROID_CHANNEL : undefined;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: item.identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.fireAt,
        ...(channelId === undefined ? {} : { channelId }),
      },
    });
    return;
  } catch {
    // Android 12+ can refuse a DATE trigger without exact-alarm permission.
  }

  const seconds = Math.max(1, Math.ceil((item.fireAt.getTime() - Date.now()) / 1000));
  await Notifications.scheduleNotificationAsync({
    identifier: item.identifier,
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      ...(channelId === undefined ? {} : { channelId }),
    },
  });
}

async function scheduleDaily(
  Notifications: NotificationsModule,
  item: { identifier: string; hour: number; minute: number; title: string; body: string },
): Promise<void> {
  const content = notificationContent(item.title, item.body);
  const channelId = Platform.OS === 'android' ? ANDROID_CHANNEL : undefined;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: item.identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: item.hour,
        minute: item.minute,
        ...(channelId === undefined ? {} : { channelId }),
      },
    });
    return;
  } catch {
    // Some Android builds refuse a DAILY trigger; fall through to the next clock.
  }

  const time = `${String(item.hour).padStart(2, '0')}:${String(item.minute).padStart(2, '0')}`;
  const fireAt = nextDailyFireAt(time);
  if (fireAt === null) {
    return;
  }

  await scheduleOne(Notifications, {
    identifier: item.identifier,
    fireAt,
    title: item.title,
    body: item.body,
  });
}

export async function syncMethodNotificationSchedule(t: Translator): Promise<void> {
  const Notifications = await loadNotifications();
  if (Notifications === null) {
    return;
  }

  ensureHandler(Notifications);

  const signals = useGrailStore.getState().methodSignals;
  const tasks = useGrailStore.getState().tasks;
  const methodPlan = planMethodSignals(signals).map((item) =>
    item.kind === 'daily'
      ? {
          kind: 'daily' as const,
          identifier: item.identifier,
          hour: item.hour,
          minute: item.minute,
          title: t('settings.signals.daily.title'),
          body: t('signal.body'),
        }
      : {
          kind: 'once' as const,
          identifier: item.identifier,
          fireAt: item.fireAt,
          title: t('signal.title'),
          body: item.note.length > 0 ? item.note : t('signal.body'),
        },
  );
  const plan = [
    ...methodPlan,
    ...(signals.enabled !== true
      ? []
      : planAtomNotifications(tasks, t).map((item) => ({
          kind: 'once' as const,
          identifier: item.identifier,
          fireAt: item.fireAt,
          title: item.title,
          body: item.body,
        }))),
  ];

  await cancelLegacyAndOwned(Notifications);

  if (plan.length === 0) {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: t('signal.channel'),
      importance: Notifications.AndroidImportance.HIGH,
      sound: SIGNAL_SOUND,
      enableVibrate: true,
      vibrationPattern: [0, 220, 160, 220],
    });
  }

  const granted = await ensureMethodNotificationPermission();
  if (!granted) {
    return;
  }

  for (const item of plan) {
    if (item.kind === 'daily') {
      await scheduleDaily(Notifications, item).catch(() => undefined);
      continue;
    }

    await scheduleOne(Notifications, item).catch(() => undefined);
  }
}

export async function subscribeMethodNotificationResponse(
  onOpen: () => void,
): Promise<() => void> {
  const Notifications = await loadNotifications();
  if (Notifications === null) {
    return () => undefined;
  }

  ensureHandler(Notifications);

  const subscription = Notifications.addNotificationResponseReceivedListener(() => {
    onOpen();
  });

  return () => {
    subscription.remove();
  };
}
