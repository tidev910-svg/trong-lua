/** True when the player asked the system for less motion (UI_DIRECTION "Chất lượng tối thiểu"). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Waits `ms`, or a token time with reduced motion (animations are presentation only; state already changed). */
export function pause(ms: number, reducedMs = 0): Promise<void> {
  const wait = prefersReducedMotion() ? reducedMs : ms;
  return new Promise((resolve) => setTimeout(resolve, wait));
}
