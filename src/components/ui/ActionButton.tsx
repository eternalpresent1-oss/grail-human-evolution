import { type ReactElement } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, motion, radius, space, typography, withAlpha } from '@/theme';
import { playConfirm, playDeny } from '@/utils/grailSound';

type ActionVariant = 'primary' | 'outline' | 'danger' | 'alarm' | 'ghost';
type ActionTone = 'brand' | 'gold' | 'cool' | 'bevel';
type ActionSound = 'confirm' | 'deny' | 'none';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  /** `primary` fills, `outline` draws a gradient edge, `danger` is rose, `alarm` is ember red, `ghost` is text only. */
  variant?: ActionVariant;
  /** Which gradient ramp a filled or outlined button burns. */
  tone?: ActionTone;
  /** Secondary line under the label. */
  hint?: string;
  /** Swaps the label for a spinner and blocks further presses. */
  busy?: boolean;
  disabled?: boolean;
  /** Override the press voice. Default: drop on a filled button, scatter on danger, silence otherwise. */
  sound?: ActionSound;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Every actionable surface in the app funnels through here so press feedback,
 * corner radius and label weight stay identical across screens and modals.
 * Feedback rides the `pressed` flag rather than a shared value: mutating one
 * from a render-time callback is what the immutability lint rule forbids.
 */
export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  tone = 'brand',
  hint,
  busy = false,
  disabled = false,
  sound,
  accessibilityLabel,
  style,
}: ActionButtonProps): ReactElement {
  const blocked = disabled || busy;
  const voice =
    sound ??
    (variant === 'danger' || variant === 'alarm'
      ? 'deny'
      : variant === 'primary'
        ? 'confirm'
        : 'none');

  return (
    <Pressable
      onPress={() => {
        if (voice === 'confirm') {
          playConfirm();
        } else if (voice === 'deny') {
          playDeny();
        }
        onPress();
      }}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy }}
      style={({ pressed }) => [
        styles.hit,
        variant === 'ghost' ? styles.hitGhost : null,
        style,
        disabled ? styles.disabled : null,
        pressed && !blocked ? styles.pressed : null,
      ]}
    >
      <ActionSurface
        variant={variant}
        tone={tone}
        label={label}
        busy={busy}
        {...(hint === undefined ? {} : { hint })}
      />
    </Pressable>
  );
}

function ActionSurface({
  variant,
  tone,
  label,
  busy,
  hint,
}: {
  variant: ActionVariant;
  tone: ActionTone;
  label: string;
  busy: boolean;
  hint?: string;
}): ReactElement {
  if (variant === 'ghost') {
    return <Text style={styles.ghostLabel}>{label}</Text>;
  }

  if (variant === 'danger' || variant === 'alarm') {
    return (
      <View style={variant === 'alarm' ? styles.alarmFill : styles.dangerFill}>
        <Text style={variant === 'alarm' ? styles.alarmLabel : styles.dangerLabel}>{label}</Text>
        {hint === undefined ? null : (
          <Text style={variant === 'alarm' ? styles.alarmHint : styles.dangerHint}>{hint}</Text>
        )}
      </View>
    );
  }

  if (variant === 'outline') {
    return (
      <LinearGradient
        colors={gradients[tone]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.outlineEdge}
      >
        <View style={styles.outlineFill}>
          {busy ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              <Text style={styles.outlineLabel}>{label}</Text>
              {hint === undefined ? null : <Text style={styles.outlineHint}>{hint}</Text>}
            </>
          )}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradients[tone]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={styles.primaryFill}
    >
      {busy ? (
        <ActivityIndicator color={colors.text.onAccent} />
      ) : (
        <>
          <Text style={styles.primaryLabel}>{label}</Text>
          {hint === undefined ? null : <Text style={styles.primaryHint}>{hint}</Text>}
        </>
      )}
    </LinearGradient>
  );
}

const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 1 } as const;

const styles = StyleSheet.create({
  hit: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  hitGhost: {
    alignSelf: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  pressed: {
    transform: [{ scale: motion.pressScale }],
    opacity: motion.pressOpacity,
  },
  disabled: {
    opacity: 0.45,
  },

  primaryFill: {
    minHeight: 54,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    ...typography.button,
    color: colors.text.onAccent,
    textAlign: 'center',
  },
  primaryHint: {
    ...typography.buttonHint,
    marginTop: space.hair,
    color: withAlpha(colors.text.onAccent, 0.72),
    textAlign: 'center',
  },

  /** The gradient itself is the border: a 2px ring around an opaque core. */
  outlineEdge: {
    padding: space.hair,
    borderRadius: radius.md,
  },
  outlineFill: {
    minHeight: 50,
    borderRadius: radius.md - 2,
    backgroundColor: colors.surface.control,
    paddingVertical: space.lg - 2,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineLabel: {
    ...typography.button,
    color: colors.text.primary,
    textAlign: 'center',
  },
  outlineHint: {
    ...typography.buttonHint,
    marginTop: space.hair,
    color: colors.accent.goldMuted,
    textAlign: 'center',
  },

  dangerFill: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.burned,
    backgroundColor: colors.tint.burned,
    paddingVertical: space.lg - 1,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  dangerLabel: {
    ...typography.button,
    color: colors.state.dangerText,
    textAlign: 'center',
  },
  dangerHint: {
    ...typography.buttonHint,
    marginTop: space.hair,
    color: colors.state.dangerText,
    opacity: 0.72,
    textAlign: 'center',
  },

  /** Ember red of the “day is not closed” card — a full wipe, not a field burn. */
  alarmFill: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.danger,
    backgroundColor: colors.tint.dangerStrong,
    paddingVertical: space.lg - 1,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  alarmLabel: {
    ...typography.button,
    color: colors.state.danger,
    textAlign: 'center',
  },
  alarmHint: {
    ...typography.buttonHint,
    marginTop: space.hair,
    color: colors.state.danger,
    opacity: 0.72,
    textAlign: 'center',
  },

  ghostLabel: {
    ...typography.bodyStrong,
    color: colors.text.faint,
    textAlign: 'center',
  },
});
