import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { FOCUSABLE, trapStep } from "./focus";

interface Props {
  title: ReactNode;
  children: ReactNode;
  /** Escape and a click on the veil call this; omit for notebooks the player must answer (e.g. settlement). */
  onClose?: () => void;
  className?: string;
}

/**
 * Vở ô ly as a modal (UI_DIRECTION "Giấy"): veil + tilted notebook page. Keeps keyboard focus inside,
 * focuses the first control on open and gives focus back to where it was on close.
 * Mounted = open; the parent decides when to show it.
 */
export function Notebook({ title, children, onClose, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const book = ref.current;
    const first = book?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? book)?.focus();
    return () => previous?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && onClose) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const next = trapStep(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey);
    e.preventDefault();
    if (next !== null) items[next]?.focus();
  };

  return (
    <>
      <div className="veil" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={`book paper${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </>
  );
}
