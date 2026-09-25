import type { GameData } from "../../data/schemas";
import type { Rng } from "../rng";
import type { CropState, FloodPlan, GameState, PlotState } from "../types";
import { lastDay, monthOfDay } from "./calendar";
import { cropStage, findVariety } from "./growth";
import { isWaterStressed } from "./water";

const LODGING_STAGES = new Set(["flowering", "ripening", "harvestable"]);

/**
 * Flood window in game days (decision B5): from the first day of windowStartMonth to the last
 * game day of windowEndMonth, scanning forward so the November days at game start are excluded.
 */
export function floodWindow(data: GameData): { start: number; end: number } {
  const { windowStartMonth, windowEndMonth } = data.crop.flood;
  const days = Array.from({ length: lastDay(data.calendar) + 1 }, (_, day) => day);
  const start = days.find((day) => monthOfDay(day, data.calendar) === windowStartMonth);
  if (start === undefined) throw new Error("flood window start month is not in the game year");
  const end = days.findLast((day) => day >= start && monthOfDay(day, data.calendar) === windowEndMonth);
  if (end === undefined) throw new Error("flood window end month does not follow its start in the game year");
  return { start, end };
}

/**
 * Decided once at game start (spec §6, decision B5). RNG: chance(yearChance); if it floods,
 * nextInt(day), nextInt(warning days before), nextInt(error of the announced day).
 */
export function planFlood(data: GameData, rng: Rng): FloodPlan {
  const flood = data.crop.flood;
  if (!rng.chance(flood.yearChance)) return { day: null, warningDay: null, predictedDay: null };
  const range = floodWindow(data);
  const day = rng.nextInt(range.start, range.end);
  const warningDays = rng.nextInt(flood.warningDaysRange[0], flood.warningDaysRange[1]);
  const error = rng.nextInt(flood.warningDayError[0], flood.warningDayError[1]);
  return { day, warningDay: Math.max(0, day - warningDays), predictedDay: day + error };
}

function hurt(crop: CropState, amount: number): CropState {
  return { ...crop, health: Math.max(0, crop.health - amount) };
}

/**
 * Night step 5 (spec §6, §9; decisions A6, A16, B5). Per plot with a crop, in plot order:
 *  - growing and water outside the optimal band: − stressHealthPerDay
 *  - storm while flowering: chance(floweringLossChance) → − floweringHealthLoss
 *  - heavy rain or storm from flowering on, not lodged yet:
 *      chance(lodgingChanceBase × variety.lodgingSusceptibility × method.lodgingRisk) → − lodgingHealthLoss, lodged
 *  - flood day: − uniform(healthLossRange), water = 100 (growing or harvestable)
 */
export function updateHealth(state: GameState, data: GameData, rng: Rng): GameState {
  const weather = state.weather.realized;
  if (weather === null) throw new Error("updateHealth must run after advanceWeather (no realized weather)");
  const { storm, water, flood, sowing } = data.crop;
  const floodToday = state.flood.day === state.day;

  const plots = state.plots.map((plot): PlotState => {
    if (plot.crop === null || (plot.status !== "growing" && plot.status !== "harvestable")) return plot;
    let crop = plot.crop;
    const stage = cropStage(crop, data);
    const growing = plot.status === "growing";

    if (growing && isWaterStressed(crop.water, data)) crop = hurt(crop, water.stressHealthPerDay);

    if (growing && weather === "storm" && stage === "flowering" && rng.chance(storm.floweringLossChance)) {
      crop = hurt(crop, storm.floweringHealthLoss);
    }

    if ((weather === "storm" || weather === "heavy_rain") && LODGING_STAGES.has(stage) && !crop.lodged) {
      const chance =
        storm.lodgingChanceBase * findVariety(crop.varietyId, data).lodgingSusceptibility * sowing[crop.method].lodgingRisk;
      if (rng.chance(chance)) crop = { ...hurt(crop, storm.lodgingHealthLoss), lodged: true };
    }

    if (floodToday) {
      const [lo, hi] = flood.healthLossRange;
      crop = { ...hurt(crop, lo + rng.nextFloat() * (hi - lo)), water: 100 };
    }

    return crop === plot.crop ? plot : { ...plot, crop };
  });

  const log = floodToday ? [...state.log, { day: state.day, kind: "flood" as const }] : state.log;
  return { ...state, plots, log };
}

/** Night step 6 (part): the radio announces the flood the evening before warningDay. */
export function announceFlood(state: GameState): GameState {
  const { warningDay, predictedDay } = state.flood;
  if (warningDay === null || predictedDay === null || warningDay !== state.day + 1) return state;
  return { ...state, log: [...state.log, { day: state.day + 1, kind: "floodWarning", predictedDay }] };
}
