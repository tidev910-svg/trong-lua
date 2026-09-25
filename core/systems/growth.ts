import { GROWTH_STAGES, type GameData, type GrowthStage, type VarietyData } from "../../data/schemas";
import type { CropStage, CropState, GameState } from "../types";
import { monthKeyOfDay } from "./calendar";
import { isWaterStressed } from "./water";

/** Guards stage thresholds against float drift from summing rates like 0.9 (same rule in any port). */
const GROWTH_EPSILON = 1e-9;

export function findVariety(varietyId: string, data: GameData): VarietyData {
  const variety = data.varieties.find((v) => v.id === varietyId);
  if (!variety) throw new Error(`unknown variety "${varietyId}"`);
  return variety;
}

/**
 * Growth needed to *enter* each stage, plus "harvestable" at the variety's base duration (spec §4):
 * germination 0 · tillering germinationDays · panicle base − (panicle + flowering + ripening) · …
 */
export function stageThresholds(variety: VarietyData, data: GameData): Record<CropStage, number> {
  const { germinationDays, stageDays } = data.crop;
  const panicle = variety.baseDurationDays - stageDays.panicle - stageDays.flowering - stageDays.ripening;
  return {
    germination: 0,
    tillering: germinationDays,
    panicle,
    flowering: panicle + stageDays.panicle,
    ripening: panicle + stageDays.panicle + stageDays.flowering,
    harvestable: variety.baseDurationDays,
  };
}

const STAGES_IN_ORDER: readonly CropStage[] = [...GROWTH_STAGES, "harvestable"];

export function stageOfGrowth(growth: number, variety: VarietyData, data: GameData): CropStage {
  const thresholds = stageThresholds(variety, data);
  let stage: CropStage = "germination";
  for (const s of STAGES_IN_ORDER) if (growth + GROWTH_EPSILON >= thresholds[s]) stage = s;
  return stage;
}

export function cropStage(crop: CropState, data: GameData): CropStage {
  return stageOfGrowth(crop.growth, findVariety(crop.varietyId, data), data);
}

/** Current growing stage, or null once harvestable. */
export function growingStage(crop: CropState, data: GameData): GrowthStage | null {
  const stage = cropStage(crop, data);
  return stage === "harvestable" ? null : stage;
}

/**
 * careFactor (spec §4, decision B7): product of the factors that apply —
 * water outside the optimal band × water.stressGrowthFactor, health below lowHealthCare.threshold × its growthFactor.
 */
export function careFactor(crop: CropState, data: GameData): number {
  let factor = 1;
  if (isWaterStressed(crop.water, data)) factor *= data.crop.water.stressGrowthFactor;
  if (crop.health < data.crop.lowHealthCare.threshold) factor *= data.crop.lowHealthCare.growthFactor;
  return factor;
}

/** Growth added on the night of `day` (month of that day). */
export function nightlyGrowth(day: number, care: number, data: GameData): number {
  return data.crop.growthRateByMonth[monthKeyOfDay(day, data.calendar)] * care;
}

/**
 * Night step 3: growing crops gain growthRateByMonth × careFactor. A crop that reaches its
 * base duration becomes "harvestable" from the next morning.
 */
export function updateGrowth(state: GameState, data: GameData): GameState {
  return {
    ...state,
    plots: state.plots.map((plot) => {
      if (plot.status !== "growing" || plot.crop === null) return plot;
      const crop = plot.crop;
      const growth = crop.growth + nightlyGrowth(state.day, careFactor(crop, data), data);
      const ripe = stageOfGrowth(growth, findVariety(crop.varietyId, data), data) === "harvestable";
      return {
        ...plot,
        status: ripe ? "harvestable" : "growing",
        crop: { ...crop, growth, harvestableDay: ripe ? state.day + 1 : null },
      };
    }),
  };
}

/**
 * Public schedule shown to the player and used for skip stop conditions (decision A13):
 * the first morning each stage is expected, assuming careFactor = 1.
 * Days may run past the end of the game year.
 */
export function expectedSchedule(sowDay: number, varietyId: string, data: GameData): Record<CropStage, number> {
  const variety = findVariety(varietyId, data);
  const thresholds = stageThresholds(variety, data);
  const schedule: Partial<Record<CropStage, number>> = { germination: sowDay };
  let growth = 0;
  for (let day = sowDay; schedule.harvestable === undefined; day++) {
    growth += nightlyGrowth(day, 1, data);
    for (const s of STAGES_IN_ORDER) {
      if (schedule[s] === undefined && growth + GROWTH_EPSILON >= thresholds[s]) schedule[s] = day + 1;
    }
  }
  return schedule as Record<CropStage, number>;
}
