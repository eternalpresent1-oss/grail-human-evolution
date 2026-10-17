/** Always two decimals so a 0.01 shift on a vertex is visible. */
export function formatVectorPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Whole percent for analysis cards: readable, no +13-style deltas. */
export function formatCardPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Number only, for templates that already carry a `%` in the string. */
export function formatScore(value: number): string {
  return value.toFixed(2);
}
