/**
 * 4pt rhythm with two half-steps. Gaps, paddings and margins pick from this
 * ladder only; the sub-4pt rungs exist because a label and the value beneath it
 * need tighter binding than the grid allows.
 */
export const space = {
  hair: 2,
  xs: 4,
  snug: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Corner ladder: the bigger the surface, the rounder it gets. */
export const radius = {
  /** Badges and small wells. */
  sm: 12,
  /** Buttons, inputs, dimension chips. */
  md: 16,
  /** List cards. */
  lg: 20,
  /** Section panels and the octagon frame. */
  xl: 24,
  /** Modal sheets. */
  xxl: 28,
  pill: 999,
} as const;

export const layout = {
  /** Horizontal gutter shared by all three screens. */
  screenX: 20,
  /** Floor for the top inset so content never hugs the status bar. */
  screenTopMin: 20,
  /** Screens with a floating footer reserve this much scroll clearance. */
  footerClearance: 128,
  footerX: 16,
  footerBottom: 12,
  /** Touch padding for small icon-sized controls. */
  hitSlop: 12,
} as const;

/** Durations in ms and the press transform shared by every control. */
export const motion = {
  instant: 160,
  base: 240,
  slow: 460,
  pressScale: 0.97,
  pressOpacity: 0.92,
} as const;
