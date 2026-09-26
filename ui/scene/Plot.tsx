import type { PlotView } from "../../core/playerView";
import type { CropStage } from "../../core/types";
import { STAGE } from "../format";
import { Interactive, type HoverHandler } from "./Interactive";
import { plotRect } from "./layout";

/** Drawn stage: what the player saw last time; never-seen or harvested land is drawn as empty mud and water. */
export type DrawnStage = CropStage | "empty";

export function drawnStage(plot: PlotView): DrawnStage {
  const known = plot.known;
  if (known === null || known.status === "empty" || known.status === "harvested") return "empty";
  return known.stage ?? "empty";
}

/** Water layer: strong on young crops, fading as the rice covers the field (reference). */
export function waterOpacity(stage: DrawnStage): number {
  if (stage === "empty" || stage === "germination") return 0.55;
  if (stage === "tillering") return 0.35;
  return 0.15;
}

/** Knowledge older than this many days is faded and the stake says how old (UI_DIRECTION). */
export const STALE_DAYS = 2;

export function isStale(plot: PlotView, inField: boolean): boolean {
  return !inField && plot.staleDays !== null && plot.staleDays >= STALE_DAYS;
}

export function stakeLabel(plot: PlotView, inField: boolean, landAccess: boolean): string {
  const name = `Thửa ${plot.id + 1}`;
  if (!landAccess) return `${name}: đã trả ruộng`;
  return isStale(plot, inField) ? `${name}, thấy ${plot.staleDays} ngày trước` : name;
}

export function hasSigns(plot: PlotView): boolean {
  return plot.known !== null && Object.values(plot.known.signs).some((s) => s !== null);
}

/** Hover / screen-reader label: what clicking does, plus what is known. */
export function plotLabel(plot: PlotView, inField: boolean, landAccess: boolean): string {
  const stage = drawnStage(plot);
  const what = stage === "empty" ? "ruộng trống" : STAGE[stage].toLowerCase();
  const verb = !landAccess ? "đã trả ruộng" : inField ? "xem và làm việc" : "ra đồng";
  return `Thửa ${plot.id + 1} (${what}): ${verb}`;
}

/** Stake sign width from its text (SVG text cannot be measured when rendering on the server). */
function stakeWidth(label: string): number {
  return Math.round(14 + label.length * 6.6);
}

interface Props {
  plot: PlotView;
  inField: boolean;
  landAccess: boolean;
  onActivate: () => void;
  onHover?: HoverHandler;
}

/**
 * One rice plot, 240×170, drawn from what the player knows (UI_DIRECTION "Thửa ruộng"):
 * bund, mud, water, rice pattern by stage, faded when the knowledge is old, stake with the name,
 * red "!" when signs were seen.
 */
export function Plot({ plot, inField, landAccess, onActivate, onHover }: Props) {
  const { x, y, width, height } = plotRect(plot.id);
  const stage = drawnStage(plot);
  const stale = isStale(plot, inField);
  const stake = stakeLabel(plot, inField, landAccess);
  const inner = { x: x + 9, y: y + 9, width: width - 18, height: height - 18 };
  return (
    <Interactive
      label={plotLabel(plot, inField, landAccess)}
      onActivate={onActivate}
      onHover={onHover}
      highlight={<rect x={x - 10} y={y - 10} width={width + 20} height={height + 20} rx={12} fill="#fff4c2" opacity={0.5} />}
    >
      <g data-plot={plot.id} data-stage={stage}>
        <rect x={x} y={y} width={width} height={height} rx={6} fill="#8a6b45" />
        <rect {...inner} fill="#6b4f33" />
        <rect {...inner} fill="#5aa6a0" opacity={waterOpacity(stage)} />
        <rect {...inner} fill={`url(#p-${stage})`} />
        {(stale || !landAccess) && <rect {...inner} fill="#e9eee0" opacity={0.28} />}
        <g transform={`translate(${x + 18} ${y + height - 8})`}>
          <rect x={0} y={-34} width={5} height={34} fill="#6f5130" />
          <rect x={-6} y={-50} width={stakeWidth(stake)} height={20} rx={3} fill="#fffdf6" stroke="#6f5130" />
          <text x={0} y={-35} fontFamily="Be Vietnam Pro, sans-serif" fontSize={12} fill="#2c2a22">
            {stake}
          </text>
        </g>
        {hasSigns(plot) && landAccess && (
          <g transform={`translate(${x + width - 26} ${y + 26})`}>
            <circle r={15} fill="#b8352c" />
            <text y={6} textAnchor="middle" fontFamily="Be Vietnam Pro, sans-serif" fontWeight={700} fontSize={18} fill="#fff">
              !
            </text>
          </g>
        )}
      </g>
    </Interactive>
  );
}
