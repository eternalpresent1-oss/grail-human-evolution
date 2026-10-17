import { type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

const CENTERED = { width: 0, height: 0 } as const;

/**
 * Coloured halo. Kept as a factory because glow colour is meaningful — cyan for
 * achievement, gold for the sealed frontier, red for a passed deadline.
 */
export function glow(color: string, opacity: number, radius: number): ViewStyle {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: CENTERED,
  };
}

/**
 * Depth ladder. `row` is deliberately the cheapest: list items render dozens of
 * times and a wide blur radius there costs real frames on Android.
 */
export const elevation = {
  row: {
    shadowColor: colors.void,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  card: {
    shadowColor: colors.void,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  /** Footer actions that float above scrolling content. */
  floating: {
    shadowColor: colors.void,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
} satisfies Record<string, ViewStyle>;

/**
 * Gradient ramps. Tuples are `as const` because `LinearGradient` types `colors`
 * as a two-or-more tuple rather than a plain array.
 */
export const gradients = {
  /** The signature ramp: cold spark burning into gold. */
  brand: [colors.accent.cyanBright, colors.accent.cyan, colors.accent.gold],
  /** Reward and unlock actions. */
  gold: [colors.text.ivory, colors.accent.gold, colors.accent.goldDeep],
  /** Recovery actions — cold end of the ramp only. */
  cool: [colors.accent.cyanBright, colors.accent.cyan],
  /** Neutral bevel for secondary buttons. */
  bevel: ['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.05)', 'rgba(232, 184, 109, 0.18)'],
  /** Backdrop of the shareable proof card — colder than any in-app surface. */
  proofCard: ['#0B1220', colors.ink, '#041018'],
  /** Screen backdrops, one per tab so the three read as distinct rooms. */
  screenAtoms: [colors.void, '#10102A', colors.ink],
  screenGrail: [colors.void, '#14081F', '#070B14', colors.void],
  screenAnalysis: [colors.void, '#0B1220', '#12081C', colors.void],
} as const;

/** Backdrop stop positions, paired with the screen ramps above. */
export const gradientStops = {
  screenAtoms: [0, 0.42, 1],
  screenGrail: [0, 0.28, 0.68, 1],
  screenAnalysis: [0, 0.28, 0.62, 1],
} as const;
