import { useEffect, useState } from "react";

/** How long a toast stays (UI_DIRECTION: ~2.6 s). */
export const TOAST_MS = 2600;

/**
 * Paper strip sliding down from the top with a handwritten message. A new `id` shows the message again,
 * even when the text is the same.
 */
export function Toast({ message, id }: { message: string | null; id: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!message) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), TOAST_MS);
    return () => clearTimeout(t);
  }, [message, id]);
  return (
    <div className={`toast${shown && message ? " show" : ""}`} role="status">
      {message}
    </div>
  );
}
