import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DeadlineWatcher } from '@/components/DeadlineWatcher';
import { MethodSignalsWatcher } from '@/components/MethodSignalsWatcher';
import { SoundAtmosphere } from '@/components/SoundAtmosphere';
import { restoreAccountSession } from '@/api/accountSession';
import { TranslatorProvider, useTranslator } from '@/i18n/TranslatorProvider';
import { colors, space, typography } from '@/theme';
import { useGrailStore } from '@/store/useGrailStore';

void SplashScreen.preventAutoHideAsync();

const poster = require('../../assets/splash.png') as number;

/** Long enough to read ARCHE after the system icon, short enough not to stall the day. */
const POSTER_HOLD_MS = 2200;

function AccessNotice(): ReactElement | null {
  const t = useTranslator();
  const block = useGrailStore((state) => state.accessBlock);
  const clearAccessBlock = useGrailStore((state) => state.clearAccessBlock);
  if (block === null) {
    return null;
  }

  return (
    <Pressable onPress={clearAccessBlock} style={styles.notice} accessibilityRole="button">
      <Text style={styles.noticeText}>{t(block === 'limit' ? 'access.limit' : 'access.premium')}</Text>
    </Pressable>
  );
}

export default function RootLayout(): ReactElement {
  const isReady = useGrailStore((state) => state.isHydrated);
  const [holdDone, setHoldDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const hideSystemSplash = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setHoldDone(true), POSTER_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void restoreAccountSession().finally(() => setSessionReady(true));
  }, []);

  const showApp = isReady && holdDone && sessionReady;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {Platform.OS === 'android' ? <NavigationBar style="light" /> : null}
      <DeadlineWatcher />
      {showApp ? (
        // Mounted only after persist lands. A timeout must never show seed
        // state — that window could write, then rehydrate would wipe it.
        <TranslatorProvider>
          <SoundAtmosphere />
          <MethodSignalsWatcher />
          <AccessNotice />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.void },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding"
              options={{ gestureEnabled: false, animation: 'fade' }}
            />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="survey" options={{ presentation: 'modal' }} />
            <Stack.Screen name="campaign" options={{ presentation: 'modal' }} />
          </Stack>
        </TranslatorProvider>
      ) : (
        <View style={styles.void} onLayout={hideSystemSplash}>
          <Image source={poster} style={styles.poster} resizeMode="contain" />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.void,
  },
  void: {
    flex: 1,
    backgroundColor: colors.void,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  notice: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xxl,
    zIndex: 20,
  },
  noticeText: {
    ...typography.caption,
    color: colors.text.ivory,
    textAlign: 'center',
  },
});
