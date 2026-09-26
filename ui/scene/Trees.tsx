function Palm({ x, y, dx, top, color }: { x: number; y: number; dx: number; top: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 0 C${dx * 0.3} -${top * 0.45} ${dx * 0.6} -${top * 0.75} ${dx} -${top}`} stroke="#8a6a3f" strokeWidth={7} fill="none" />
      <g transform={`translate(${dx} -${top})`} fill={color}>
        <path d="M0 0 Q-40 -10 -60 20 Q-30 0 0 0" />
        <path d="M0 0 Q40 -12 62 16 Q30 -2 0 0" />
        <path d="M0 0 Q-18 -40 -40 -46 Q-8 -30 0 0" />
        <path d="M0 0 Q20 -40 44 -42 Q10 -28 0 0" />
      </g>
    </g>
  );
}

/** Coconut palms and a banana tree (decoration). */
export function Trees() {
  return (
    <g>
      <Palm x={70} y={170} dx={14} top={130} color="#3e7d32" />
      <Palm x={1150} y={575} dx={-16} top={120} color="#447f35" />
      <g transform="translate(40 470)" fill="#5c9b3e">
        <ellipse cx={0} cy={0} rx={22} ry={40} transform="rotate(-25)" />
        <ellipse cx={18} cy={-8} rx={20} ry={38} transform="rotate(20)" />
        <rect x={-3} y={10} width={7} height={40} fill="#6d8a3a" />
      </g>
    </g>
  );
}
