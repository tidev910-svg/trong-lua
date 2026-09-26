import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../motion";

/** Characters added per tick and tick length: the radio "types" its news (reference: 2 chars / 18 ms). */
const STEP = 2;
const TICK_MS = 18;

/** Text that appears as if typed; shown at once with prefers-reduced-motion. */
export function TypedText({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? text.length : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const t = setInterval(() => {
      setShown((n) => {
        if (n + STEP >= text.length) clearInterval(t);
        return Math.min(text.length, n + STEP);
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [text]);
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
    </p>
  );
}
