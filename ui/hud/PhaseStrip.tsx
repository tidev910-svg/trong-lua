import type { ReactNode } from "react";
import type { VisualPhase } from "./labels";

/** Sun position on the arc for each phase (reference). */
const SUN: Record<VisualPhase, [number, number]> = { briefing: [14, 30], morning: [24, 12], afternoon: [62, 12], night: [74, 34] };

interface Props {
  phase: VisualPhase;
  /** Guidance: bold lead, then the rest. */
  lead: string;
  text: string;
  /** Context buttons ("Mở bản tin", "Xong việc, về nhà"). */
  children?: ReactNode;
}

/** Phase strip (bottom centre): sun arc, what to do now, context buttons. */
export function PhaseStrip({ phase, lead, text, children }: Props) {
  const [cx, cy] = SUN[phase];
  return (
    <div className="hud strip">
      <svg className="sun-arc" width={84} height={44} viewBox="0 0 84 44" aria-hidden="true">
        <path d="M6 40 A36 36 0 0 1 78 40" fill="none" stroke="#d9d2bb" strokeWidth={3} strokeDasharray="3 5" />
        <circle cx={cx} cy={cy} r={7} fill={phase === "night" ? "#c9d4ff" : "#f0b43a"} />
      </svg>
      <div className="prompt">
        <b>{lead}</b> {text}
      </div>
      {children !== undefined && <div className="strip-btns">{children}</div>}
    </div>
  );
}
