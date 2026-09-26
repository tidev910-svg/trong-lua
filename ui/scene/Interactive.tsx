import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

/** Keys that press a focused scene object, like a button. */
export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

/** Hover label position in client (viewport) pixels, or null when the pointer leaves. */
export type HoverHandler = (label: string | null, clientX?: number, clientY?: number) => void;

interface Props {
  /** What the object does, for the hover tag and screen readers ("Nhà: nghỉ ngơi"). */
  label: string;
  onActivate: () => void;
  onHover?: HoverHandler;
  /** Highlight drawn behind the object on hover/focus (the `.hl` glow of the reference). */
  highlight: ReactNode;
  children: ReactNode;
  id?: string;
}

/**
 * Makes a scene object usable like a button (UI_DIRECTION "Interactive"): role=button, Tab focus,
 * Enter/Space, glow on hover and focus, and a hover label reported to the HUD.
 */
export function Interactive({ label, onActivate, onHover, highlight, children, id }: Props) {
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (!isActivationKey(e.key)) return;
    e.preventDefault();
    onActivate();
  };
  const onClick = (e: MouseEvent<SVGGElement>) => {
    e.stopPropagation();
    onHover?.(null);
    onActivate();
  };
  return (
    <g
      id={id}
      className="obj"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseMove={(e) => onHover?.(label, e.clientX, e.clientY)}
      onMouseLeave={() => onHover?.(null)}
    >
      <g className="hl">{highlight}</g>
      {children}
    </g>
  );
}
