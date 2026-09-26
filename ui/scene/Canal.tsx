import { Interactive, type HoverHandler } from "./Interactive";
import { BOAT } from "./layout";

/** Canal along the bottom (y ≈ 580–700). */
export function Canal() {
  return (
    <g>
      <path d="M0 596 C300 575 800 615 1200 588 L1200 690 C800 712 300 676 0 700Z" fill="#4e9c9a" />
      <path d="M40 640 q20 -6 40 0 M420 628 q20 -6 40 0 M840 646 q20 -6 40 0" stroke="rgba(255,255,255,.35)" strokeWidth={2} fill="none" />
    </g>
  );
}

function BoatShape() {
  return <path d="M-60 0 Q0 22 60 0 L50 -6 Q0 10 -50 -6Z" fill="#7a5433" />;
}

interface BoatProps {
  /** A trader is waiting: there are lots to sell (UI_DIRECTION: only clickable then). */
  trader: boolean;
  onActivate: () => void;
  onHover?: HoverHandler;
}

/** The trader's boat; a clickable object only while there is rice waiting to be sold. */
export function Boat({ trader, onActivate, onHover }: BoatProps) {
  const at = `translate(${BOAT.x} ${BOAT.y})`;
  if (!trader) {
    return (
      <g transform={at}>
        <BoatShape />
      </g>
    );
  }
  return (
    <g transform={at}>
      <Interactive label="Thương lái: bán lúa" onActivate={onActivate} onHover={onHover} highlight={<ellipse cx={0} cy={-4} rx={80} ry={34} fill="url(#glow)" />}>
        <BoatShape />
        {/* The trader sitting in the boat, with sacks of rice */}
        <rect x={-30} y={-22} width={18} height={14} rx={3} fill="#e8d59a" stroke="#b39a55" />
        <rect x={-10} y={-20} width={16} height={12} rx={3} fill="#e8d59a" stroke="#b39a55" />
        <circle cx={26} cy={-24} r={6} fill="#d9a877" />
        <rect x={20} y={-18} width={12} height={12} rx={3} fill="#8c3b2e" />
        <path d="M12 -26 L26 -40 L40 -26Z" fill="#e8d59a" stroke="#b39a55" strokeWidth={1.5} />
      </Interactive>
    </g>
  );
}
