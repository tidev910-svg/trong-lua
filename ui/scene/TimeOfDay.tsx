import type { VisualPhase } from "../hud/labels";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./layout";

/** Light over the scene by time of day, and the night layer (stars, fireflies, lit windows). */
export function TimeOfDay({ phase }: { phase: VisualPhase }) {
  const afternoon = phase === "afternoon";
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect className="tint" width={SCENE_WIDTH} height={SCENE_HEIGHT} fill={afternoon ? "#f39a4a" : "#f6c27a"} opacity={afternoon ? 0.14 : 0.06} />
      <g className="night" opacity={phase === "night" ? 1 : 0}>
        <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="#0e1a3a" opacity={0.62} />
        <g fill="#fff8d6">
          <circle cx={120} cy={40} r={1.6} />
          <circle cx={420} cy={30} r={1.2} />
          <circle cx={760} cy={48} r={1.8} />
          <circle cx={1010} cy={26} r={1.3} />
          <circle cx={600} cy={140} r={1.1} />
          <circle cx={880} cy={160} r={1.4} />
        </g>
        <g fill="#e7ff8a">
          <circle cx={500} cy={420} r={2} />
          <circle cx={760} cy={300} r={2} />
          <circle cx={330} cy={470} r={2} />
        </g>
        <rect x={96} y={270} width={36} height={26} fill="#ffcf6b" opacity={0.9} />
        <rect x={204} y={270} width={36} height={26} fill="#ffcf6b" opacity={0.9} />
      </g>
    </g>
  );
}
