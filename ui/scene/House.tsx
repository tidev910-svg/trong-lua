import { Interactive, type HoverHandler } from "./Interactive";

interface Props {
  onActivate: () => void;
  onHover?: HoverHandler;
}

/** Thatched house (x 58–282, y 170–348): rest. */
export function House({ onActivate, onHover }: Props) {
  return (
    <Interactive id="house" label="Nhà: nghỉ ngơi" onActivate={onActivate} onHover={onHover} highlight={<ellipse cx={170} cy={300} rx={150} ry={120} fill="url(#glow)" />}>
      <rect x={80} y={245} width={180} height={95} fill="#d8c29a" />
      <rect x={150} y={280} width={36} height={60} fill="#5b4128" />
      <rect x={96} y={270} width={36} height={26} fill="#5b4128" opacity={0.75} />
      <rect x={204} y={270} width={36} height={26} fill="#5b4128" opacity={0.75} />
      <path d="M58 250 L170 170 L282 250Z" fill="#c9a24b" />
      <path d="M58 250 L170 170 L282 250Z" fill="url(#thatch)" opacity={0.6} />
      <path d="M58 250 H282" stroke="#9c7632" strokeWidth={5} />
      <rect x={84} y={340} width={172} height={8} fill="#9c7a52" />
    </Interactive>
  );
}
