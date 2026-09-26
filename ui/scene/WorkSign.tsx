import { Interactive, type HoverHandler } from "./Interactive";

interface Props {
  /** Hired work today (view.hiredWorkAvailable). */
  hiring: boolean;
  onActivate: () => void;
  onHover?: HoverHandler;
}

/** Wooden sign on the road, centred at (700, 42): hired work. */
export function WorkSign({ hiring, onActivate, onHover }: Props) {
  return (
    <Interactive id="sign" label="Bảng gỗ: đi làm thuê" onActivate={onActivate} onHover={onHover} highlight={<circle cx={700} cy={50} r={68} fill="url(#glow)" />}>
      <rect x={696} y={60} width={8} height={42} fill="#6f5130" />
      <rect x={638} y={20} width={124} height={44} rx={3} fill="#a07b4a" stroke="#6f5130" strokeWidth={3} />
      <text x={700} y={48} textAnchor="middle" fontFamily="Patrick Hand, cursive" fontSize={19} fill="#fff8e6">
        {hiring ? "Cần người làm" : "Hôm nay nghỉ"}
      </text>
    </Interactive>
  );
}
