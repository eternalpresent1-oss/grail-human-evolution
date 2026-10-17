import { Platform, type TextStyle } from 'react-native';

/**
 * The type ramp. Every `Text` in the app spreads one of these and then only
 * overrides colour and margins — sizes, weights and tracking live here so the
 * same role reads identically on all three screens.
 */
export const typography = {
  /** Identity lockup on the Grail screen. One per screen at most. */
  wordmark: {
    fontFamily: Platform.select({ ios: 'Didot', android: 'serif', default: 'serif' }),
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '300',
    letterSpacing: 6,
    includeFontPadding: false,
  },
  /** Large display line. */
  display: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '300',
    letterSpacing: 0.6,
  },
  /** Manifesto on a fixed-width artboard, such as the shareable proof card. */
  displaySm: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '300',
    letterSpacing: 0.4,
  },
  /** One-line essence answer, shown rather than edited. */
  quote: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '300',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  /** Screen title. */
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  /** Headline of a modal sheet — one step under a screen title. */
  modalTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  /** Section title and panel headline. */
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  /** Same size as `heading`, lighter — for panels that must not shout. */
  headingQuiet: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  /** Standalone card headline. */
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  /** Row headline inside a list. */
  itemTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  bodyStrong: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  /** Long-form copy that carries a modal — one notch above body. */
  bodyLead: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  /** Compact bold label: summary names, counters, step numbers. */
  labelLg: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  /** Text the user types. */
  input: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  /** Quiet couplet under a name, such as the proof-card creed. */
  motto: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    letterSpacing: 0.35,
    fontStyle: 'italic',
  },
  captionStrong: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  /** Screen-level eyebrow: wide tracking, always uppercase in source. */
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 3.2,
  },
  /** Card-level eyebrow: tighter than the screen kicker so hierarchy holds. */
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  /** Status pills and the smallest labels. */
  micro: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  /** Headline number. Tabular so scores do not jitter while animating. */
  metric: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricLg: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricSm: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonHint: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
} satisfies Record<string, TextStyle>;
