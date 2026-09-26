import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/** A box in the coordinates of the container the note is placed in (CSS pixels). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Keep the note clear of the HUD: below the calendar/purse, above the phase strip (reference layout). */
const GAP = 12;
const TOP_CLEAR = 150;
const BOTTOM_CLEAR = 110;

/**
 * Where a pinned note goes (UI_DIRECTION "Mẩu giấy ghim"): right of the object, else left of it,
 * else centred when the screen is too narrow; vertically level with the object but clear of the HUD.
 */
export function placeNote(anchor: Box, note: Size, container: Size): { left: number; top: number } {
  let left = anchor.right + GAP;
  if (left + note.width > container.width - GAP) left = anchor.left - note.width - GAP;
  if (left < GAP) left = Math.max(GAP, (container.width - note.width) / 2);
  let top = Math.min(Math.max(TOP_CLEAR, anchor.top), container.height - note.height - BOTTOM_CLEAR);
  if (top < GAP) top = GAP;
  return { left: Math.round(left), top: Math.round(top) };
}

/** Alternating tilt, ±1.3° (UI_DIRECTION). */
export function noteTilt(index: number): number {
  return index % 2 === 0 ? -1.4 : 1.2;
}

interface Props {
  title: ReactNode;
  children: ReactNode;
  /** Object the note belongs to, in container coordinates. */
  anchor: Box;
  container: Size;
  /** Used for the alternating tilt (e.g. plot id). */
  index: number;
  onClose: () => void;
}

/**
 * Mẩu giấy ghim: small paper with tape, placed beside a scene object. Escape, the × button or a click
 * outside closes it. Focus moves to its first control so it works from the keyboard.
 */
export function PinnedNote({ title, children, anchor, container, index, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos(placeNote(anchor, { width: el.offsetWidth, height: el.offsetHeight }, container));
  }, [anchor.left, anchor.top, anchor.right, anchor.bottom, container.width, container.height, children]);

  // Latest onClose without re-running the open effect (parents often pass a new function each render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const note = ref.current;
    (note?.querySelector<HTMLElement>(".act:not([disabled])") ?? note?.querySelector<HTMLElement>("button"))?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (note && e.target instanceof Node && !note.contains(e.target)) onCloseRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      ref={ref}
      className="note paper"
      role="dialog"
      aria-label={typeof title === "string" ? title : undefined}
      onKeyDown={onKeyDown}
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? "visible" : "hidden",
        transform: `rotate(${noteTilt(index)}deg)`,
      }}
    >
      <button type="button" className="close" aria-label="Đóng" onClick={onClose}>
        ×
      </button>
      <div className="note-body">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
