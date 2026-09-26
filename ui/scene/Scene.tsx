import { useEffect, useRef, type ReactNode } from "react";
import type { PlayerView } from "../../core/playerView";
import { Boat, Canal } from "./Canal";
import { Defs } from "./Defs";
import { Farmer } from "./Farmer";
import { Ground } from "./Ground";
import { House } from "./House";
import type { HoverHandler } from "./Interactive";
import { FARMER_HOME, MOBILE_FOCUS_X, SCENE_HEIGHT, SCENE_WIDTH, type Point } from "./layout";
import { LedgerBench } from "./LedgerBench";
import { Plot } from "./Plot";
import { PumpShed } from "./PumpShed";
import { Road } from "./Road";
import { Trees } from "./Trees";
import { WorkSign } from "./WorkSign";

export interface SceneHandlers {
  onPlot: (plotId: number) => void;
  onHouse: () => void;
  onSign: () => void;
  onLedger: () => void;
  onTrader: () => void;
  onHover?: HoverHandler;
}

interface Props extends SceneHandlers {
  view: PlayerView;
  farmerAt?: Point;
  /** Layers drawn above everything in the SVG (time of day, night; M2.3). */
  overlay?: ReactNode;
}

export function isInField(view: PlayerView): boolean {
  return view.phase.kind === "halfDay" && view.phase.activity === "field";
}

/**
 * The world in one SVG (viewBox 1200×720), layers in the order of UI_DIRECTION: ground → road, canal → trees →
 * house, ledger, sign, pump shed → plots → farmer → overlays. Everything is drawn from the PlayerView.
 */
export function Scene({ view, farmerAt = FARMER_HOME, overlay, onPlot, onHouse, onSign, onLedger, onTrader, onHover }: Props) {
  const inField = isInField(view);
  return (
    <svg className="scene" viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Khung cảnh ruộng lúa">
      <Defs />
      <Ground />
      <Road />
      <Canal />
      <Boat trader={view.lots.length > 0} onActivate={onTrader} onHover={onHover} />
      <Trees />
      <House onActivate={onHouse} onHover={onHover} />
      <LedgerBench onActivate={onLedger} onHover={onHover} />
      <WorkSign hiring={view.hiredWorkAvailable} onActivate={onSign} onHover={onHover} />
      <PumpShed />
      <g className="plots">
        {view.plots.map((plot) => (
          <Plot key={plot.id} plot={plot} inField={inField} landAccess={view.landAccess} onActivate={() => onPlot(plot.id)} onHover={onHover} />
        ))}
      </g>
      <Farmer at={farmerAt} />
      {overlay}
    </svg>
  );
}

/** Horizontal scroll that centres `focusX` (scene units) when the scene is wider than the screen. */
export function initialScrollLeft(sceneWidthPx: number, viewportWidthPx: number, focusX = MOBILE_FOCUS_X): number {
  if (sceneWidthPx <= viewportWidthPx) return 0;
  const target = (sceneWidthPx * focusX) / SCENE_WIDTH - viewportWidthPx / 2;
  return Math.round(Math.min(sceneWidthPx - viewportWidthPx, Math.max(0, target)));
}

/**
 * Scroll container for the scene. On wide screens the scene fits; on phones (≤ 640px) it keeps its
 * proportions at full height and scrolls sideways, starting on the fields (UI_DIRECTION "Di động").
 */
export function World({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const world = ref.current;
    const svg = world?.querySelector("svg");
    if (!world || !svg) return;
    world.scrollLeft = initialScrollLeft(svg.clientWidth, world.clientWidth);
  }, []);
  return (
    <div ref={ref} className="world">
      {children}
    </div>
  );
}
