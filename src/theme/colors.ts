/**
 * Brand primitives. Nothing outside this file should hardcode a hex value —
 * every surface, border and text colour in the app is derived from these six.
 */
const base = {
  void: '#050308',
  ink: '#07040A',
  ivory: '#F3E6C4',
  snow: '#F8FAFC',
  gold: '#E8B86D',
  goldBright: '#F3CC82',
  goldDeep: '#C4922A',
  cyan: '#22D3EE',
  cyanBright: '#67E8F9',
  cyanDeep: '#06B6D4',
  ember: '#FF453A',
  rose: '#FB7185',
  jade: '#34D399',
} as const;

/** `#RRGGBB` + alpha as an `rgba()` string, resolved once at module load. */
export function withAlpha(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const colors = {
  /** Page backgrounds. */
  void: base.void,
  ink: base.ink,

  text: {
    /** Highest contrast — titles that must cut through the void. */
    primary: base.snow,
    /** Warm brand voice for headings and manifesto copy. */
    ivory: base.ivory,
    /** Body copy. */
    muted: withAlpha(base.ivory, 0.72),
    /** Secondary meta, disabled-looking labels. */
    faint: withAlpha(base.ivory, 0.55),
    /** Text printed on top of a gold or cyan fill. */
    onAccent: '#120C18',
  },

  accent: {
    gold: base.gold,
    goldBright: base.goldBright,
    goldDeep: base.goldDeep,
    goldMuted: withAlpha(base.gold, 0.8),
    cyan: base.cyan,
    cyanBright: base.cyanBright,
    cyanDeep: base.cyanDeep,
    cyanMuted: withAlpha(base.cyanBright, 0.8),
  },

  state: {
    /** Deadline passed, imbalance, anything the user must act on. */
    danger: base.ember,
    dangerDim: '#7F1D1D',
    dangerText: '#FDA4AF',
    /** Burned atoms — softer than an active alarm. */
    burned: base.rose,
    positive: base.jade,
  },

  surface: {
    /** Glass fill behind the blur layer. */
    glass: 'rgba(8, 10, 22, 0.38)',
    /** Same tint, heavier — for panels that carry no blur of their own. */
    glassDeep: 'rgba(8, 12, 22, 0.55)',
    /** Web has no blur, so the fill carries the whole panel. */
    glassOpaque: 'rgba(8, 10, 22, 0.82)',
    /** Standard content card. */
    panel: withAlpha(base.snow, 0.045),
    /** A whisper of a panel, for cells inside an already-lit card. */
    panelSoft: withAlpha(base.snow, 0.03),
    /** Top-light sheen used as the upper stop of a card gradient. */
    sheen: withAlpha(base.snow, 0.07),
    sheenFaint: withAlpha(base.snow, 0.015),
    /** Chips, badges, icon buttons. */
    raised: withAlpha(base.snow, 0.06),
    /** Inputs and inner wells that should read as cut into the panel. */
    sunken: 'rgba(8, 6, 12, 0.72)',
    /** Inner fill of an outline button, opaque enough to hide the gradient. */
    control: 'rgba(8, 6, 12, 0.88)',
    /** Modal scrim. */
    scrim: 'rgba(2, 2, 8, 0.78)',
  },

  border: {
    /** Default 1px edge on every glass surface. */
    hairline: withAlpha(base.snow, 0.09),
    /** Slightly brighter edge for interactive controls. */
    control: withAlpha(base.snow, 0.14),
    gold: withAlpha(base.gold, 0.48),
    goldStrong: withAlpha(base.gold, 0.85),
    goldBright: withAlpha(base.goldBright, 0.78),
    cyan: withAlpha(base.cyan, 0.35),
    cyanStrong: withAlpha(base.cyanBright, 0.85),
    danger: withAlpha(base.ember, 0.55),
    burned: withAlpha(base.rose, 0.4),
  },

  /** Translucent washes used as card and chip fills. */
  tint: {
    gold: withAlpha(base.gold, 0.08),
    goldStrong: withAlpha(base.gold, 0.18),
    cyan: withAlpha(base.cyan, 0.12),
    cyanStrong: withAlpha(base.cyan, 0.18),
    danger: withAlpha(base.ember, 0.08),
    dangerStrong: withAlpha(base.ember, 0.16),
    burned: withAlpha(base.rose, 0.12),
  },

  /** Octagon chart, which draws on the SVG layer rather than on views. */
  chart: {
    grid: withAlpha(base.snow, 0.08),
    lifeFill: withAlpha(base.cyanDeep, 0.12),
    lifeStroke: withAlpha(base.cyanDeep, 0.4),
    coreFill: withAlpha(base.cyanDeep, 0.35),
    coreStroke: base.cyan,
    coreHalo: base.cyan,
    node: '#FFFFFF',
    nodeStroke: base.cyanDeep,
    label: base.snow,
    /** Rose stain, fill only — no outline series. */
    shadowFill: withAlpha(base.rose, 0.22),
    shadowStroke: base.rose,
  },
} as const;
