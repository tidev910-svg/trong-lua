import { PUMP_SHED } from "./layout";

/** Pump shed around (945–1055, 468–578), below the field, left of the palm. Decoration for now (later: water control). */
export function PumpShed() {
  return (
    <g transform={`translate(${PUMP_SHED.x} ${PUMP_SHED.y})`}>
      <rect x={10} y={40} width={90} height={70} fill="#c7b58c" />
      <path d="M0 44 L55 10 L110 44Z" fill="#8e8e8e" />
      <text x={55} y={84} textAnchor="middle" fontFamily="Be Vietnam Pro, sans-serif" fontSize={12} fill="#5b4128">
        máy bơm
      </text>
    </g>
  );
}
