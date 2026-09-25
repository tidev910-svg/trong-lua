import type { GameData } from "../../data/schemas";
import type { GameState } from "../types";

export const WATER_MIN = 0;
export const WATER_MAX = 100;

/** "Thiếu / Vừa / Ngập" (decision A5): the optimal band [water.min, water.max] is inclusive. */
export type WaterLevel = "low" | "ok" | "flooded";

export function waterLevel(water: number, data: GameData): WaterLevel {
  if (water < data.crop.water.min) return "low";
  if (water > data.crop.water.max) return "flooded";
  return "ok";
}

/** Outside the optimal band → growth slows and health drops (applied in growth/health systems). */
export function isWaterStressed(water: number, data: GameData): boolean {
  return waterLevel(water, data) !== "ok";
}

function clampWater(water: number): number {
  return Math.min(WATER_MAX, Math.max(WATER_MIN, water));
}

/**
 * Night step 2: every plot with a crop moves by deltaByWeather of the weather that
 * just happened (state.weather.realized, set by night step 1), clamped to 0–100.
 */
export function updateWater(state: GameState, data: GameData): GameState {
  const weather = state.weather.realized;
  if (weather === null) throw new Error("updateWater must run after advanceWeather (no realized weather)");
  const delta = data.crop.water.deltaByWeather[weather];
  return {
    ...state,
    plots: state.plots.map((plot) =>
      plot.crop === null ? plot : { ...plot, crop: { ...plot.crop, water: clampWater(plot.crop.water + delta) } },
    ),
  };
}

/** Water level after the "điều chỉnh nước" field action. Cost and energy are charged by the action. */
export function adjustedWater(data: GameData): number {
  return data.crop.water.adjustTarget;
}
