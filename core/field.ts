import type { GameData } from "../data/schemas";
import { cropStage, findVariety, GROWTH_EPSILON, stageThresholds } from "./systems/growth";
import { signLevel } from "./systems/pests";
import { waterLevel } from "./systems/water";
import type { GameState, KnownPlotInfo, PlotState } from "./types";

/** Health label shown to the player: the first band (highest min) the health reaches (decision A5). */
export function healthBandLabel(health: number, data: GameData): string {
  const band = data.crop.healthBands.find((b) => health >= b.min);
  return (band ?? data.crop.healthBands[data.crop.healthBands.length - 1])?.label ?? "";
}

/**
 * Progress to ripeness the player sees in the field: true growth over the harvestable threshold, 0–1.
 * Exactly 1 once the stage is harvestable (same tolerance as the stage thresholds).
 */
export function ripenessOf(growth: number, harvestableAt: number): number {
  if (growth + GROWTH_EPSILON >= harvestableAt) return 1;
  return Math.max(0, growth / harvestableAt);
}

/** What looking at a plot today reveals. */
export function observePlot(plot: PlotState, day: number, data: GameData): KnownPlotInfo {
  const crop = plot.crop;
  if (crop === null) {
    return { lastVisitDay: day, status: plot.status, stage: null, waterLevel: null, healthBand: null, signs: {}, ripeness: null };
  }
  return {
    lastVisitDay: day,
    status: plot.status,
    stage: cropStage(crop, data),
    waterLevel: waterLevel(crop.water, data),
    healthBand: healthBandLabel(crop.health, data),
    signs: Object.fromEntries(data.pests.map((p) => [p.id, signLevel(crop.pests[p.id] ?? 0, p)])),
    ripeness: ripenessOf(crop.growth, stageThresholds(findVariety(crop.varietyId, data), data).harvestable),
  };
}

/** "Thăm đồng": refreshes what the player knows about every plot (spec §3, decision B10). */
export function visitField(state: GameState, data: GameData): GameState {
  return { ...state, plots: state.plots.map((p) => ({ ...p, known: observePlot(p, state.day, data) })) };
}

/** Refreshes knowledge of one plot after acting on it (decision B10). */
export function reobservePlot(state: GameState, plotId: number, data: GameData): GameState {
  return { ...state, plots: state.plots.map((p) => (p.id === plotId ? { ...p, known: observePlot(p, state.day, data) } : p)) };
}
