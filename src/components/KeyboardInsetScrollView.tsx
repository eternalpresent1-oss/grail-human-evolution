import { useEffect, useRef, type ReactElement, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type ScrollViewProps,
} from 'react-native';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { space } from '@/theme';

interface KeyboardInsetScrollViewProps extends ScrollViewProps {
  /** When false, skip the Android keyboard pad (parent already lifts). */
  keyboardPad?: boolean;
}

/**
 * Same lift as ModalSheet: shrink the viewport above the Android keyboard,
 * then scroll the focused field into that remaining window.
 */
export function KeyboardInsetScrollView({
  keyboardPad = true,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
  automaticallyAdjustKeyboardInsets,
  onScroll,
  style,
  children,
  ...rest
}: KeyboardInsetScrollViewProps): ReactElement {
  const keyboardHeight = useKeyboardHeight(keyboardPad);
  const androidPad = keyboardPad && Platform.OS === 'android' && keyboardHeight > 0 ? keyboardHeight : 0;
  const scrollRef = useRef<ScrollView>(null);
  const innerRef = useRef<View>(null);

  useEffect(() => {
    if (!keyboardPad) {
      return;
    }

    const lift = (): void => {
      const node = TextInput.State.currentlyFocusedInput();
      const scroll = scrollRef.current;
      const inner = innerRef.current;
      if (node === null || scroll === null || inner === null) {
        return;
      }

      node.measureLayout(
        inner,
        (_x, y) => {
          scroll.scrollTo({ y: Math.max(0, y - space.lg), animated: true });
        },
        () => undefined,
      );
    };

    const run = (): void => {
      requestAnimationFrame(() => {
        setTimeout(lift, 50);
      });
    };

    const shows = [
      Keyboard.addListener('keyboardWillShow', run),
      Keyboard.addListener('keyboardDidShow', run),
    ];
    return () => {
      for (const sub of shows) {
        sub.remove();
      }
    };
  }, [keyboardPad]);

  return (
    <ScrollView
      {...rest}
      ref={scrollRef}
      innerViewRef={innerRef as RefObject<View>}
      style={[style, androidPad > 0 ? { marginBottom: androidPad } : null]}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      automaticallyAdjustKeyboardInsets={
        automaticallyAdjustKeyboardInsets ?? Platform.OS === 'ios'
      }
      scrollEventThrottle={16}
      onScroll={onScroll}
    >
      {children}
    </ScrollView>
  );
}
