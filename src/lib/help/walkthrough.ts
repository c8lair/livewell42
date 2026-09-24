/** Timing and index math for the Cash App Bitcoin overlay. */

export const CASHAPP_WALKTHROUGH_FRAME_MS = 1600;

export function stepWalkthroughIndex(
  index: number,
  delta: number,
  length: number,
): number {
  if (length <= 0) return 0;
  return ((index + delta) % length + length) % length;
}
