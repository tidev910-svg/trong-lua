/**
 * Fixed layout of the scene in SVG units (viewBox 1200×720), from reference/ui-reference.html and
 * docs/UI_DIRECTION.md "Bố cục cảnh". Every object keeps its frame and anchor here, so a sprite can
 * replace the shapes later without moving anything.
 */

export const SCENE_WIDTH = 1200;
export const SCENE_HEIGHT = 720;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PLOT_SIZE = { width: 240, height: 170 } as const;

/** Top-left corner of plots 0–4. */
export const PLOT_ORIGINS: readonly Point[] = [
  { x: 370, y: 170 },
  { x: 625, y: 170 },
  { x: 880, y: 170 },
  { x: 370, y: 365 },
  { x: 625, y: 365 },
];

export function plotRect(plotId: number): Rect {
  const o = PLOT_ORIGINS[plotId] ?? { x: 0, y: 0 };
  return { x: o.x, y: o.y, width: PLOT_SIZE.width, height: PLOT_SIZE.height };
}

/** Where the farmer stands to work a plot: middle of its bottom edge. */
export function plotStandPoint(plotId: number): Point {
  const r = plotRect(plotId);
  return { x: r.x + r.width / 2, y: r.y + r.height + 8 };
}

export const HOUSE: Rect = { x: 58, y: 170, width: 224, height: 178 };
export const LEDGER_BENCH: Point = { x: 255, y: 375 };
export const WORK_SIGN: Point = { x: 700, y: 42 };
export const PUMP_SHED: Point = { x: 900, y: 380 };
export const BOAT: Point = { x: 980, y: 625 };

/** Farmer anchor points (feet). */
export const FARMER_HOME: Point = { x: 215, y: 392 };
export const FARMER_AT_SIGN: Point = { x: 700, y: 112 };

/** On a narrow screen the scene scrolls sideways; it starts centred on this x (the fields). */
export const MOBILE_FOCUS_X = 700;
