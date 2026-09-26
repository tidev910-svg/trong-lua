import type { PlotView } from "../../core/playerView";
import type { CropStage } from "../../core/types";
import { plotName } from "../../core/names";
import { STAGE } from "../format";
import { ripenessText } from "../hud/labels";
import { Interactive, type HoverHandler } from "./Interactive";
import { plotRect, type Rect } from "./layout";

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

export function stakeLabel(plot: PlotView, inField: boolean, landAccess: boolean, plotCount = 1): string {
  const name = plotName(plot.id, plotCount);
  if (!landAccess) return `${name}: đã trả ruộng`;
  return isStale(plot, inField) ? `${name}, thấy ${plot.staleDays} ngày trước` : name;
}

export function hasSigns(plot: PlotView): boolean {
  return plot.known !== null && Object.values(plot.known.signs).some((s) => s !== null);
}

/** Hover / screen-reader label: what clicking does, plus what is known. */
export function plotLabel(plot: PlotView, inField: boolean, landAccess: boolean, plotCount = 1): string {
  const stage = drawnStage(plot);
  const what = stage === "empty" ? "ruộng trống" : STAGE[stage].toLowerCase();
  const verb = !landAccess ? "đã trả ruộng" : inField ? "xem và làm việc" : "ra đồng";
  const ripe = plot.crop !== null && landAccess ? `; ${ripenessText(plot.crop.progress).toLowerCase()}` : "";
  return `${plotName(plot.id, plotCount)} (${what}${ripe}): ${verb}`;
}

/**
 * Paper tag with the ripeness bar, top-left of the field: progress on the public schedule, not the true growth,
 * so it stays sharp even when what was seen in the field is old.
 */
function RipenessTag({ x, y, width, progress }: { x: number; y: number; width: number; progress: { ratio: number; daysLeft: number } }) {
  const inner = width - 16;
  return (
    <g transform={`translate(${x} ${y})`} data-ripeness={Math.round(progress.ratio * 100)} aria-hidden="true">
      <rect width={width} height={38} rx={3} fill="#fffdf6" stroke="#6f5130" />
      <text x={8} y={16} fontFamily="Be Vietnam Pro, sans-serif" fontSize={12} fill="#2c2a22">
        {ripenessText(progress)}
      </text>
      <rect x={8} y={24} width={inner} height={7} rx={3.5} fill="#e5e0cf" />
      <rect x={8} y={24} width={Math.round(inner * progress.ratio)} height={7} rx={3.5} fill="#d4a72c" />
    </g>
  );
}

/**
 * Where the stake, the ripeness tag and the red "!" go. On the wide single field they gather around its middle,
 * which a phone shows first (the scene scrolls sideways and starts near x = MOBILE_FOCUS_X); on small plots they
 * sit in the corners.
 */
export function markPositions(rect: Rect, stakeW: number): { stakeX: number; tagX: number; tagWidth: number; signX: number } {
  const tagWidth = Math.min(230, rect.width - 60);
  if (rect.width < 400) return { stakeX: rect.x + 18, tagX: rect.x + 16, tagWidth, signX: rect.x + rect.width - 26 };
  const mid = rect.x + rect.width / 2;
  const tagX = Math.round(mid - tagWidth / 2);
  return { stakeX: Math.round(mid - stakeW / 2 + 6), tagX, tagWidth, signX: tagX - 24 };
}

/** Stake sign width from its text (SVG text cannot be measured when rendering on the server). */
function stakeWidth(label: string): number {
  return Math.round(14 + label.length * 6.6);
}

interface Props {
  plot: PlotView;
  plotCount: number;
  inField: boolean;
  landAccess: boolean;
  onActivate: () => void;
  onHover?: HoverHandler;
}

/**
 * The rice field (or one plot when the core runs with several), drawn from what the player knows (UI_DIRECTION "Thửa ruộng"):
 * bund, mud, water, rice pattern by stage, faded when the knowledge is old, stake with the name, ripeness tag,
 * red "!" when signs were seen.
 */
export function Plot({ plot, plotCount, inField, landAccess, onActivate, onHover }: Props) {
  const { x, y, width, height } = plotRect(plot.id, plotCount);
  const stage = drawnStage(plot);
  const stale = isStale(plot, inField);
  const stake = stakeLabel(plot, inField, landAccess, plotCount);
  const inner = { x: x + 9, y: y + 9, width: width - 18, height: height - 18 };
  const marks = markPositions({ x, y, width, height }, stakeWidth(stake));
  return (
    <Interactive
      label={plotLabel(plot, inField, landAccess, plotCount)}
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
        <g transform={`translate(${marks.stakeX} ${y + height - 8})`}>
          <rect x={0} y={-34} width={5} height={34} fill="#6f5130" />
          <rect x={-6} y={-50} width={stakeWidth(stake)} height={20} rx={3} fill="#fffdf6" stroke="#6f5130" />
          <text x={0} y={-35} fontFamily="Be Vietnam Pro, sans-serif" fontSize={12} fill="#2c2a22">
            {stake}
          </text>
        </g>
        {plot.crop !== null && landAccess && <RipenessTag x={marks.tagX} y={y + 16} width={marks.tagWidth} progress={plot.crop.progress} />}
        {hasSigns(plot) && landAccess && (
          <g transform={`translate(${marks.signX} ${y + 35})`}>
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
