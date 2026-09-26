import { Interactive, type HoverHandler } from "./Interactive";

interface Props {
  onActivate: () => void;
  onHover?: HoverHandler;
}

/** Bench with the ledger book, around (255, 375): money and debts. */
export function LedgerBench({ onActivate, onHover }: Props) {
  return (
    <Interactive id="ledger" label="Sổ: tiền và nợ" onActivate={onActivate} onHover={onHover} highlight={<circle cx={255} cy={372} r={38} fill="url(#glow)" />}>
      <rect x={226} y={372} width={60} height={10} fill="#8a6a3f" />
      <rect x={232} y={382} width={5} height={14} fill="#8a6a3f" />
      <rect x={276} y={382} width={5} height={14} fill="#8a6a3f" />
      <g transform="translate(242 358) rotate(-8)">
        <rect width={30} height={18} fill="#5b6bc0" />
        <rect x={2} y={2} width={26} height={14} fill="#f7f8f1" />
        <path d="M15 2 V16" stroke="#5b6bc0" />
      </g>
    </Interactive>
  );
}
