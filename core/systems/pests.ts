import type { GameData, PestData } from "../../data/schemas";
import type { Rng } from "../rng";
import type { CropState, GameState, PlotState, RegionalAlert } from "../types";
import { monthKeyOfDay } from "./calendar";
import { findVariety, growingStage } from "./growth";

export type SignLevel = "light" | "medium" | "heavy";

export function findPest(pestId: string, data: GameData): PestData {
  const pest = data.pests.find((p) => p.id === pestId);
  if (!pest) throw new Error(`unknown pest "${pestId}"`);
  return pest;
}

/** What a field visit shows (spec §5 "Dấu hiệu"): nothing below visibleThreshold, then light / medium / heavy. */
export function signLevel(density: number, pest: PestData): SignLevel | null {
  if (density < pest.visibleThreshold) return null;
  if (density >= pest.signLevels.heavy) return "heavy";
  if (density >= pest.signLevels.medium) return "medium";
  return "light";
}

export function isAlertActive(alerts: readonly RegionalAlert[], pestId: string, day: number): boolean {
  return alerts.some((a) => a.pestId === pestId && a.startDay <= day && day <= a.endDay);
}

function isPreventiveActive(crop: CropState, pestId: string, day: number): boolean {
  const until = crop.preventiveUntil[pestId];
  return until !== undefined && day <= until;
}

function density(crop: CropState, pestId: string): number {
  return crop.pests[pestId] ?? 0;
}

function withDensity(crop: CropState, pestId: string, value: number): CropState {
  return { ...crop, pests: { ...crop.pests, [pestId]: Math.min(1, value) } };
}

function mapGrowing(plots: PlotState[], fn: (crop: CropState, plot: PlotState) => CropState): PlotState[] {
  return plots.map((p) => (p.status === "growing" && p.crop !== null ? { ...p, crop: fn(p.crop, p) } : p));
}

/**
 * Night step 4 (spec §5), for every growing plot, pests in data order:
 *  1. density 0 → appears at initialDensity with chance spawnChance × (alert ? spawnMultiplier : 1);
 *     otherwise density += density × growthRate × weatherFactor × susceptibility × stageFactor × preventive.
 *  2. Spread (decision B9: plots in a row, neighbors ±1), using densities from before spreading.
 *  3. Damage: above damageThreshold, health −= damagePerDay × density (floor 0).
 * RNG: one chance per (plot, pest) at density 0; one chance per (source, pest, growing neighbor) above spreadThreshold.
 */
export function updatePests(state: GameState, data: GameData, rng: Rng): GameState {
  const weather = state.weather.realized;
  if (weather === null) throw new Error("updatePests must run after advanceWeather (no realized weather)");
  const day = state.day;

  // 1. Appear / grow
  let plots = mapGrowing(state.plots, (crop) => {
    const stage = growingStage(crop, data);
    if (stage === null) return crop;
    const variety = findVariety(crop.varietyId, data);
    let next = crop;
    for (const pest of data.pests) {
      const d = density(crop, pest.id);
      if (d === 0) {
        const multiplier = isAlertActive(state.regionalAlerts, pest.id, day) ? pest.regionalAlert.spawnMultiplier : 1;
        if (rng.chance(pest.spawnChance * multiplier)) next = withDensity(next, pest.id, pest.initialDensity);
      } else {
        const preventive = isPreventiveActive(crop, pest.id, day) ? pest.preventiveFactor : 1;
        const rate =
          pest.growthRate *
          pest.weatherFactor[weather] *
          (variety.pestSusceptibility[pest.id] ?? 1) *
          pest.stageFactor[stage] *
          preventive;
        next = withDensity(next, pest.id, d + d * rate);
      }
    }
    return next;
  });

  // 2. Spread from a snapshot so plot order does not matter
  const before = plots;
  for (const source of before) {
    if (source.status !== "growing" || source.crop === null) continue;
    for (const pest of data.pests) {
      if (density(source.crop, pest.id) <= pest.spreadThreshold) continue;
      for (const neighborId of [source.id - 1, source.id + 1]) {
        const neighbor = before.find((p) => p.id === neighborId);
        if (!neighbor || neighbor.status !== "growing" || neighbor.crop === null) continue;
        if (!rng.chance(pest.spreadChance)) continue;
        plots = plots.map((p) =>
          p.id === neighborId && p.crop !== null
            ? { ...p, crop: withDensity(p.crop, pest.id, Math.max(density(p.crop, pest.id), pest.initialDensity)) }
            : p,
        );
      }
    }
  }

  // 3. Damage
  plots = mapGrowing(plots, (crop) => {
    let health = crop.health;
    for (const pest of data.pests) {
      const d = density(crop, pest.id);
      if (d > pest.damageThreshold) health -= pest.damagePerDay * d;
    }
    return health === crop.health ? crop : { ...crop, health: Math.max(0, health) };
  });

  return { ...state, plots };
}

/** "Phun thuốc trị": density ×= (1 − sprayEffectiveness). Cost/energy are charged by the action. */
export function sprayCure(crop: CropState, pestId: string, data: GameData): CropState {
  const pest = findPest(pestId, data);
  return withDensity(crop, pestId, density(crop, pestId) * (1 - pest.sprayEffectiveness));
}

/** "Phun phòng": growth × preventiveFactor on the nights of day … day + preventiveDays − 1. */
export function sprayPreventive(crop: CropState, pestId: string, day: number, data: GameData): CropState {
  const pest = findPest(pestId, data);
  return { ...crop, preventiveUntil: { ...crop.preventiveUntil, [pestId]: day + pest.preventiveDays - 1 } };
}

/**
 * Night step 6 (part): drop finished alerts, then each pest without an active alert may start one
 * tomorrow, lasting durationDays (decision B9: at most one per pest). One chance per such pest.
 */
export function updateRegionalAlerts(state: GameState, data: GameData, rng: Rng): GameState {
  const tomorrow = state.day + 1;
  const alerts = state.regionalAlerts.filter((a) => a.endDay >= tomorrow);
  const month = monthKeyOfDay(state.day, data.calendar);
  for (const pest of data.pests) {
    if (alerts.some((a) => a.pestId === pest.id)) continue;
    if (rng.chance(pest.regionalAlert.chancePerDayByMonth[month])) {
      alerts.push({ pestId: pest.id, startDay: tomorrow, endDay: tomorrow + pest.regionalAlert.durationDays - 1 });
    }
  }
  return { ...state, regionalAlerts: alerts };
}
