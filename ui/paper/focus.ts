/** Selector for elements that can take keyboard focus inside a paper. */
export const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus trap step: where Tab (or Shift+Tab) should go from `current` among `count` focusable elements,
 * wrapping at both ends. `current` = -1 when focus is outside the list. Returns null when there is nothing to focus.
 */
export function trapStep(current: number, count: number, backwards: boolean): number | null {
  if (count === 0) return null;
  if (current < 0) return backwards ? count - 1 : 0;
  if (backwards) return current === 0 ? count - 1 : current - 1;
  return current === count - 1 ? 0 : current + 1;
}
