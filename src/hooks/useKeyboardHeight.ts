import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, type KeyboardEvent } from 'react-native';

function overlapFromEvent(event: KeyboardEvent): number {
  const frame = event.endCoordinates;
  const screenHeight = Dimensions.get('screen').height;
  const fromTop = frame.screenY > 0 ? screenHeight - frame.screenY : 0;
  return Math.max(frame.height, fromTop, 0);
}

/**
 * Live overlap of the software keyboard. Android modals do not resize with
 * `adjustResize`, so callers must pad or shrink by this value themselves.
 */
export function useKeyboardHeight(enabled = true): number {
  const [height, setHeight] = useState(0);
  const [listening, setListening] = useState(enabled);

  if (enabled !== listening) {
    setListening(enabled);
    if (!enabled) {
      setHeight(0);
    }
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onShow = (event: KeyboardEvent): void => {
      setHeight(overlapFromEvent(event));
    };
    const onHide = (): void => {
      setHeight(0);
    };

    const shows = [
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardDidShow', onShow),
    ];
    const hides = [
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];

    return () => {
      for (const sub of shows) {
        sub.remove();
      }
      for (const sub of hides) {
        sub.remove();
      }
    };
  }, [enabled]);

  return height;
}

