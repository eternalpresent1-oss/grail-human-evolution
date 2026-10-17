import { useEffect, type ReactElement } from 'react';
import { AppState } from 'react-native';

import { useGrailStore } from '@/store/useGrailStore';
import { prepareGrailAudio, setAmbientPlaying } from '@/utils/grailSound';

export function SoundAtmosphere(): ReactElement | null {
  const isHydrated = useGrailStore((state) => state.isHydrated);
  const soundEnabled = useGrailStore((state) => state.soundEnabled);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let live = true;

    void prepareGrailAudio()
      .then(() => {
        if (live) {
          void setAmbientPlaying(soundEnabled);
        }
      })
      .catch(() => undefined);

    const sub = AppState.addEventListener('change', (next) => {
      void setAmbientPlaying(next === 'active' && useGrailStore.getState().soundEnabled);
    });

    return () => {
      live = false;
      sub.remove();
      void setAmbientPlaying(false);
    };
  }, [isHydrated, soundEnabled]);

  return null;
}
