export interface OctagonPoint {
  readonly x: number;
  readonly y: number;
}

export const OCTAGON_SIDE_COUNT = 8;
export const OCTAGON_VALUE_MAX = 100;

/**
 * Polar vertex for an octagon radar axis.
 * Angle is `(index * 2π) / total − π/2` so index 0 sits at the top.
 *
 * `value` is a 0–100 score; `maxRadius` is the 100% ring; `center` is both cx and cy.
 */
export function getOctagonPoint(
  index: number,
  total: number,
  value: number,
  maxRadius: number,
  center: number,
): OctagonPoint {
  'worklet';
  const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
  const radius = (value / OCTAGON_VALUE_MAX) * maxRadius;

  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

export function getOctagonAngle(index: number, total: number): number {
  return (index * 2 * Math.PI) / total - Math.PI / 2;
}

export type OctagonLabelAnchor = 'start' | 'middle' | 'end';

/**
 * Side captions sit outside the 100% ring. Left labels are right-aligned and
 * right labels are left-aligned, so both would hang off the SVG. They are
 * pulled inward by this inset — left toward the right, right toward the left.
 */
export const OCTAGON_SIDE_LABEL_INSET = 22;
export const OCTAGON_POLE_LABEL_INSET = 14;

export function getOctagonLabelPlacement(
  index: number,
  total: number,
  labelRadius: number,
  center: number,
): { x: number; y: number; anchor: OctagonLabelAnchor } {
  const angle = getOctagonAngle(index, total);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const anchor: OctagonLabelAnchor = cosine > 0.38 ? 'start' : cosine < -0.38 ? 'end' : 'middle';
  const inwardX =
    anchor === 'end' ? OCTAGON_SIDE_LABEL_INSET : anchor === 'start' ? -OCTAGON_SIDE_LABEL_INSET : 0;
  const inwardY =
    anchor === 'middle' && sine < -0.38
      ? OCTAGON_POLE_LABEL_INSET
      : anchor === 'middle' && sine > 0.38
        ? -OCTAGON_POLE_LABEL_INSET
        : 0;

  return {
    x: center + labelRadius * cosine + inwardX,
    y: center + labelRadius * sine + inwardY,
    anchor,
  };
}

export function getOctagonRingPoints(
  total: number,
  value: number,
  maxRadius: number,
  center: number,
): OctagonPoint[] {
  return Array.from({ length: total }, (_, index) =>
    getOctagonPoint(index, total, value, maxRadius, center),
  );
}

export function toSvgPoints(points: readonly OctagonPoint[]): string {
  return points.map((point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`).join(' ');
}
