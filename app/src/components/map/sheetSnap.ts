/** A fling faster than this (px/s) decides the direction regardless of position. */
const FLING_VELOCITY = 500;

/**
 * Where a dragged sheet settles: a fast fling follows its direction, otherwise the
 * sheet snaps to whichever height is closer.
 */
export const snapSheetHeight = (
  height: number,
  velocityY: number,
  collapsed: number,
  expanded: number,
): number => {
  'worklet';
  if (velocityY < -FLING_VELOCITY) return expanded;
  if (velocityY > FLING_VELOCITY) return collapsed;
  return height - collapsed > (expanded - collapsed) / 2 ? expanded : collapsed;
};

export const clampSheetHeight = (height: number, collapsed: number, expanded: number): number => {
  'worklet';
  return Math.min(Math.max(height, collapsed), expanded);
};
