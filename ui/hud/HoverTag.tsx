/** Small dark label following the pointer over a scene object (x, y relative to the game box). */
export function HoverTag({ label, x, y }: { label: string | null; x: number; y: number }) {
  return (
    <div className="tag" style={{ left: x, top: y, opacity: label ? 1 : 0 }} aria-hidden="true">
      {label}
    </div>
  );
}
