import type { Point } from "./layout";

interface Props {
  /** Feet position in scene units; moving it animates the walk (CSS transition, off with reduced motion). */
  at: Point;
}

/** The farmer in a nón lá. */
export function Farmer({ at }: Props) {
  return (
    <g className="farmer" style={{ transform: `translate(${at.x}px, ${at.y}px)` }} aria-hidden="true">
      <ellipse cx={0} cy={26} rx={16} ry={5} fill="rgba(0,0,0,.25)" />
      <rect x={-8} y={2} width={16} height={22} rx={4} fill="#3a5d8c" />
      <rect x={-7} y={18} width={5} height={10} fill="#2c2a22" />
      <rect x={2} y={18} width={5} height={10} fill="#2c2a22" />
      <circle cx={0} cy={-4} r={7} fill="#d9a877" />
      <path d="M-18 -4 L0 -22 L18 -4Z" fill="#e8d59a" stroke="#b39a55" strokeWidth={1.5} />
    </g>
  );
}
