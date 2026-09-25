import type { GameData, SowingMethod } from "../../data/schemas";
import type { CropState, FertilizerApp } from "../types";
import { seasonKeyOfDay, seasonOfSowingDay } from "./calendar";
import { findVariety, growingStage } from "./growth";

// ---------------------------------------------------------------------------
// Sowing
// ---------------------------------------------------------------------------

export interface SowingCost {
  /** Seed = seedCostPerPlot × seedMultiplier; the only part payable on store credit (decision A8). */
  seed: number;
  landPrep: number;
  labor: number;
  total: number;
  energy: number;
}

/** "Làm đất và xuống giống" on one plot (spec §3, crop.json landPrep + sowing). */
export function sowingCost(varietyId: string, method: SowingMethod, data: GameData): SowingCost {
  const variety = findVariety(varietyId, data);
  const params = data.crop.sowing[method];
  const seed = Math.round(variety.seedCostPerPlot * params.seedMultiplier);
  const landPrep = data.crop.landPrep.costPerPlot;
  const labor = params.laborCost;
  return { seed, landPrep, labor, total: seed + landPrep + labor, energy: data.crop.landPrep.energy + params.energy };
}

export function newCrop(varietyId: string, method: SowingMethod, sowDay: number, data: GameData): CropState {
  findVariety(varietyId, data);
  return {
    varietyId,
    method,
    sowDay,
    growth: 0,
    health: 1,
    water: data.crop.water.start,
    fertilizerApps: [],
    harvestableDay: null,
    seasonKey: seasonKeyOfDay(sowDay, data.calendar),
    pests: Object.fromEntries(data.pests.map((p) => [p.id, 0])),
    preventiveUntil: {},
    lodged: false,
    sprayLog: [],
  };
}

// ---------------------------------------------------------------------------
// Fertilizer
// ---------------------------------------------------------------------------

/**
 * Records one fertilizer application (spec §4 "Bón phân", decision B7): correct only if the crop
 * is in a recommended stage that has not been credited yet. Cost/energy are charged by the action.
 */
export function applyFertilizer(crop: CropState, day: number, data: GameData): CropState {
  const stage = growingStage(crop, data);
  if (stage === null) throw new Error("cannot fertilize a harvestable crop");
  const recommended = data.crop.fertilizer.recommendedStages.includes(stage);
  const alreadyCredited = crop.fertilizerApps.some((a) => a.correct && a.stage === stage);
  const app: FertilizerApp = { day, stage, correct: recommended && !alreadyCredited };
  return { ...crop, fertilizerApps: [...crop.fertilizerApps, app] };
}

/**
 * nutrientFactor (DATA_SPEC crop.json): off-stage apps count as offStageEfficiency of a correct one;
 * the total (capped at 2) is interpolated linearly in nutrientFactorByCorrectApps.
 */
export function nutrientFactor(apps: readonly FertilizerApp[], data: GameData): number {
  const { nutrientFactorByCorrectApps: table, offStageEfficiency } = data.crop.fertilizer;
  const correct = apps.filter((a) => a.correct).length;
  const effective = Math.min(2, correct + (apps.length - correct) * offStageEfficiency);
  const lower = Math.floor(effective);
  const t = effective - lower;
  const lo = table[String(lower) as "0" | "1" | "2"];
  const hi = table[String(Math.min(2, lower + 1)) as "0" | "1" | "2"];
  return lo + (hi - lo) * t;
}

// ---------------------------------------------------------------------------
// Yield
// ---------------------------------------------------------------------------

/** Days past the harvest window: the window covers harvestableDay … harvestableDay + harvestWindowDays − 1. */
export function overdueDays(crop: CropState, harvestDay: number, data: GameData): number {
  if (crop.harvestableDay === null) throw new Error("crop is not harvestable yet");
  return Math.max(0, harvestDay - (crop.harvestableDay + data.crop.harvestWindowDays) + 1);
}

/** Decision B8: linear loss, capped at 1. */
export function overdueLoss(crop: CropState, harvestDay: number, data: GameData): number {
  return Math.min(1, overdueDays(crop, harvestDay, data) * data.crop.overdueLossPerDay);
}

/**
 * Spec §4 "Năng suất khi gặt":
 * baseYield[variety][season of sowing month] × health × nutrientFactor × sowing yieldFactor × (1 − overdueLoss).
 * Kilograms are not rounded; money is rounded where it changes hands (decision B16).
 */
export function harvestYieldKg(crop: CropState, harvestDay: number, data: GameData): number {
  const variety = findVariety(crop.varietyId, data);
  const season = seasonOfSowingDay(crop.sowDay, data.calendar);
  return (
    variety.baseYieldKg[season] *
    crop.health *
    nutrientFactor(crop.fertilizerApps, data) *
    data.crop.sowing[crop.method].yieldFactor *
    (1 - overdueLoss(crop, harvestDay, data))
  );
}
