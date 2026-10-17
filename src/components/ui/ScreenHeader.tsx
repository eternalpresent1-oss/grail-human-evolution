import { type ReactElement, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, space, typography, withAlpha } from '@/theme';

interface ScreenHeaderProps {
  /** Eyebrow over the title. */
  kicker?: string;
  title: string;
  /** Subtitle lines. A node, because two screens compose more than one. */
  children?: ReactNode;
  /** Right-hand slot: the gear, and whatever a screen needs beside it. */
  actions?: ReactNode;
  /** `wordmark` is the Grail identity lockup; `display` is the large system face. */
  scale?: 'title' | 'display' | 'wordmark';
  /** Gold reads as identity, cyan as instrumentation. */
  tone?: 'cyan' | 'gold';
  style?: StyleProp<ViewStyle>;
}

/**
 * The one header for all screens. Every screen used to draw its own, which is
 * why their kickers and titles had drifted apart and none of them had room for
 * an action on the right.
 */
export function ScreenHeader({
  kicker,
  title,
  children,
  actions,
  scale = 'title',
  tone = 'cyan',
  style,
}: ScreenHeaderProps): ReactElement {
  if (scale === 'wordmark') {
    return (
      <View style={[styles.wordmarkRoot, style]}>
        {actions === undefined ? null : <View style={styles.wordmarkActions}>{actions}</View>}
        <Text
          style={styles.wordmark}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.62}
        >
          {title}
        </Text>
        <View style={styles.wordmarkRule} />
        {children === undefined ? null : <View style={styles.wordmarkCopy}>{children}</View>}
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      <View style={styles.copy}>
        {kicker === undefined ? null : (
          <Text style={[styles.kicker, tone === 'gold' ? styles.kickerGold : styles.kickerCyan]}>
            {kicker}
          </Text>
        )}
        <Text
          style={[
            scale === 'display' ? styles.display : styles.title,
            kicker === undefined ? styles.titleFlush : null,
          ]}
        >
          {title}
        </Text>
        {children}
      </View>
      {actions === undefined ? null : <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  copy: {
    flex: 1,
  },
  /** Pulled up so the control centres on the kicker rather than on the title. */
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: -space.hair,
  },
  wordmarkRoot: {
    gap: space.sm,
  },
  wordmarkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  wordmark: {
    ...typography.wordmark,
    marginTop: space.xs,
    color: colors.accent.gold,
    textAlign: 'center',
    textShadowColor: withAlpha(colors.accent.gold, 0.45),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  wordmarkRule: {
    alignSelf: 'center',
    width: 56,
    height: 1,
    backgroundColor: colors.accent.gold,
    opacity: 0.55,
  },
  wordmarkCopy: {
    marginTop: space.xs,
  },
  kicker: {
    ...typography.kicker,
  },
  kickerCyan: {
    color: colors.accent.cyanMuted,
  },
  kickerGold: {
    color: colors.accent.goldMuted,
  },
  title: {
    ...typography.title,
    marginTop: space.sm + 2,
    color: colors.text.ivory,
  },
  display: {
    ...typography.display,
    marginTop: space.sm + 2,
    color: colors.text.ivory,
  },
  titleFlush: {
    marginTop: 0,
  },
});
