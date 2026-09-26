/** Dirt road along the top (y ≈ 70–130) and the path from the house to the fields. */
export function Road() {
  return (
    <g>
      <path d="M0 70 C300 95 700 55 1200 88 L1200 128 C700 96 300 136 0 112Z" fill="#c9a56b" />
      <path d="M0 92 C300 115 700 75 1200 108" stroke="#b28c52" strokeWidth={2} strokeDasharray="6 10" fill="none" />
      <path d="M250 380 C300 380 320 360 360 356" stroke="#b28c52" strokeWidth={12} fill="none" strokeLinecap="round" />
    </g>
  );
}
