import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { useGrailStore } from '@/store/useGrailStore';
import { BREATH_EXHALE_MS, BREATH_INHALE_MS } from '@/utils/breathPractice';

const dropSource = require('../../assets/sounds/drop.mp3') as number;
const shatterSource = require('../../assets/sounds/shatter.mp3') as number;
const ambientSource = require('../../assets/sounds/background.mp3') as number;
const inhaleSource = require('../../assets/sounds/vdoh.mp3') as number;
const exhaleSource = require('../../assets/sounds/vidoh.mp3') as number;

const FX_VOLUME = 0.096;
const FX_RATE = 1;
const BED_VOLUME = 0.07 * 1.15;
const BREATH_VOLUME = 0.52;
const INHALE_VOLUME = BREATH_VOLUME * 0.7;

type AudioPlayer = {
  volume: number;
  loop: boolean;
  playing: boolean;
  isLoaded: boolean;
  duration: number;
  playbackRate: number;
  shouldCorrectPitch: boolean;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<unknown> | unknown;
  setPlaybackRate?: (rate: number) => void;
};

let drop: AudioPlayer | null = null;
let shatter: AudioPlayer | null = null;
let ambient: AudioPlayer | null = null;
let inhale: AudioPlayer | null = null;
let exhale: AudioPlayer | null = null;
let prepared = false;
let unavailable = false;
let preparing: Promise<void> | null = null;

function ignore(_reason?: unknown): void {
  // Native audio and Metro both surface rejected promises as NamelessError.
}

function soundIsOn(): boolean {
  return useGrailStore.getState().soundEnabled !== false;
}

/**
 * Playback uses `expo-audio`. A development APK without that native module
 * must still boot — `expo-av` crashed this SDK on load.
 */
export function canPlayGrailAudio(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    return requireOptionalNativeModule('ExpoAudio') != null;
  } catch {
    return false;
  }
}

function loadAudio(): typeof import('expo-audio') | null {
  if (!canPlayGrailAudio()) {
    return null;
  }

  try {
    // Sync require: dynamic `import()` goes through Metro's async chunk
    // worker and then fails with "unknown module" after asset graph shifts.
    // A top-level import would load the native module during boot and can
    // take the app down when that module is absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-audio') as typeof import('expo-audio');
  } catch {
    return null;
  }
}

function replay(player: AudioPlayer | null, rate = FX_RATE): void {
  if (player === null) {
    return;
  }

  void (async () => {
    softenFx(player, rate);

    try {
      await Promise.resolve(player.seekTo(0));
    } catch {
      ignore();
    }

    try {
      player.play();
    } catch {
      ignore();
    }
  })().catch(ignore);
}

function setRate(player: AudioPlayer, rate: number): void {
  player.playbackRate = rate;
  player.setPlaybackRate?.(rate);
}

function softenFx(player: AudioPlayer, rate = FX_RATE): void {
  try {
    player.volume = FX_VOLUME;
    player.shouldCorrectPitch = true;
    setRate(player, rate);
  } catch {
    ignore();
  }
}

function softenBed(player: AudioPlayer): void {
  try {
    player.loop = true;
    player.volume = BED_VOLUME;
    player.shouldCorrectPitch = true;
    player.playbackRate = 0.94;
  } catch {
    ignore();
  }
}

export async function prepareGrailAudio(): Promise<void> {
  if (prepared || unavailable) {
    return;
  }

  if (preparing !== null) {
    await preparing;
    return;
  }

  preparing = (async () => {
    const audio = loadAudio();
    if (audio === null) {
      unavailable = true;
      return;
    }

    try {
      await audio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
        allowsRecording: false,
      });

      drop = audio.createAudioPlayer(dropSource);
      shatter = audio.createAudioPlayer(shatterSource);
      ambient = audio.createAudioPlayer(ambientSource);
      inhale = audio.createAudioPlayer(inhaleSource);
      exhale = audio.createAudioPlayer(exhaleSource);
      softenFx(drop);
      softenFx(shatter);
      softenBed(ambient);
      prepared = true;
    } catch {
      unavailable = true;
    } finally {
      preparing = null;
    }
  })();

  try {
    await preparing;
  } catch {
    unavailable = true;
    preparing = null;
  }
}

export function playConfirm(): void {
  if (unavailable || !soundIsOn()) {
    return;
  }

  void prepareGrailAudio()
    .then(() => replay(drop))
    .catch(ignore);
}

export function playDeny(): void {
  if (unavailable || !soundIsOn()) {
    return;
  }

  void prepareGrailAudio()
    .then(() => replay(shatter))
    .catch(ignore);
}

export async function setAmbientPlaying(on: boolean): Promise<void> {
  if (unavailable || !canPlayGrailAudio()) {
    return;
  }

  await prepareGrailAudio();
  if (ambient === null) {
    return;
  }

  try {
    if (on && soundIsOn()) {
      softenBed(ambient);
      if (!ambient.playing) {
        ambient.play();
      }
    } else if (ambient.playing) {
      ambient.pause();
    }
  } catch {
    ignore();
  }
}

function stopPlayer(player: AudioPlayer | null): void {
  if (player === null) {
    return;
  }

  try {
    if (player.playing) {
      player.pause();
    }
  } catch {
    ignore();
  }
}

async function nativeDuration(player: AudioPlayer, fallback: number): Promise<number> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (player.isLoaded && Number.isFinite(player.duration) && player.duration > 0.05) {
      return player.duration;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 40);
    });
  }

  return fallback;
}

function stretchTo(player: AudioPlayer, native: number, seconds: number, volume: number): void {
  const rate = Math.min(2, Math.max(0.1, native / seconds));
  const stretched = native / rate;

  try {
    player.loop = stretched + 0.08 < seconds;
    player.volume = volume;
    player.shouldCorrectPitch = false;
    setRate(player, rate);
  } catch {
    ignore();
  }
}

async function playStretched(
  player: AudioPlayer | null,
  other: AudioPlayer | null,
  seconds: number,
  fallbackNative: number,
  volume: number,
): Promise<void> {
  if (player === null || unavailable || !soundIsOn()) {
    return;
  }

  stopPlayer(other);
  const native = await nativeDuration(player, fallbackNative);

  try {
    await Promise.resolve(player.seekTo(0));
  } catch {
    ignore();
  }

  stretchTo(player, native, seconds, volume);

  try {
    player.play();
  } catch {
    ignore();
  }
}

export function playInhale(): void {
  void prepareGrailAudio()
    .then(() => playStretched(inhale, exhale, BREATH_INHALE_MS / 1000, 3.4, INHALE_VOLUME))
    .catch(ignore);
}

export function playExhale(): void {
  void prepareGrailAudio()
    .then(() => playStretched(exhale, inhale, BREATH_EXHALE_MS / 1000, 1.54, BREATH_VOLUME))
    .catch(ignore);
}

export function stopBreathVoices(): void {
  stopPlayer(inhale);
  stopPlayer(exhale);
}

export async function setBreathSession(on: boolean): Promise<void> {
  if (on) {
    stopBreathVoices();
    return;
  }

  stopBreathVoices();
}
