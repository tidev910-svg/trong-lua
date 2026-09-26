/** Shared SVG definitions: rice patterns by stage (ids p-<stage>), thatch, glow. */
export function Defs() {
  return (
    <defs>
      <pattern id="p-empty" width={40} height={18} patternUnits="userSpaceOnUse">
        <path d="M4 10 q6 -4 12 0 t12 0" fill="none" stroke="rgba(230,245,245,.45)" strokeWidth={1.5} />
      </pattern>
      <pattern id="p-germination" width={14} height={12} patternUnits="userSpaceOnUse">
        <circle cx={4} cy={6} r={1.4} fill="#b8e07a" />
        <circle cx={11} cy={11} r={1.2} fill="#a6d466" />
      </pattern>
      <pattern id="p-tillering" width={16} height={14} patternUnits="userSpaceOnUse">
        <path d="M5 13 L4 6 M7 13 L7 4 M9 13 L10 6" stroke="#7fc04a" strokeWidth={1.6} strokeLinecap="round" />
      </pattern>
      <pattern id="p-panicle" width={16} height={14} patternUnits="userSpaceOnUse">
        <path d="M5 14 L3 3 M7 14 L7 1 M9 14 L11 3 M6 14 L5 5" stroke="#3f8f3a" strokeWidth={1.8} strokeLinecap="round" />
      </pattern>
      <pattern id="p-flowering" width={16} height={14} patternUnits="userSpaceOnUse">
        <path d="M5 14 L3 3 M7 14 L7 1 M9 14 L11 3" stroke="#4d9a3c" strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={3} cy={3} r={1.3} fill="#f3efc8" />
        <circle cx={7} cy={1.5} r={1.3} fill="#f3efc8" />
        <circle cx={11} cy={3} r={1.3} fill="#f3efc8" />
      </pattern>
      <pattern id="p-ripening" width={16} height={14} patternUnits="userSpaceOnUse">
        <path d="M5 14 Q4 5 8 3 M8 14 Q8 5 12 4 M3 14 Q2 7 5 5" stroke="#b9ad3c" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </pattern>
      <pattern id="p-harvestable" width={16} height={14} patternUnits="userSpaceOnUse">
        <path d="M5 14 Q4 5 9 4 M8 14 Q8 5 13 5 M3 14 Q2 7 6 6" stroke="#e0b23a" strokeWidth={2} fill="none" strokeLinecap="round" />
      </pattern>
      <pattern id="thatch" width={10} height={10} patternUnits="userSpaceOnUse">
        <path d="M0 10 L10 0" stroke="#9c7632" strokeWidth={2} />
      </pattern>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset={0} stopColor="#fff4c2" stopOpacity={0.9} />
        <stop offset={1} stopColor="#fff4c2" stopOpacity={0} />
      </radialGradient>
    </defs>
  );
}
