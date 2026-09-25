import { describe, expect, it } from "vitest";
import type { GameData, WeatherState } from "../../../data/schemas";
import { createInitialState } from "../../../core/init";
import { Rng } from "../../../core/rng";
import { announceFlood, floodWindow, planFlood, updateHealth } from "../../../core/systems/health";
import { initialWeather } from "../../../core/systems/weather";
import type { GameState, PlotStatus } from "../../../core/types";
import { crop, data, stateWithCrops } from "../../helpers";

// Variety A growth values: tillering 10, flowering 55–62, ripening 62–90.
const TILLERING = 10;
const FLOWERING = 57;
const RIPENING = 70;
const noFlood = { day: null, warningDay: null, predictedDay: null };

function withCrop(patch: Partial<GameData["crop"]>): GameData {
  return { ...data, crop: { ...data.crop, ...patch } };
}

function night(s: GameState, weather: WeatherState, gameData: GameData = data, seed = 1): GameState {
  return updateHealth({ ...s, flood: s.flood.day === null ? noFlood : s.flood, weather: { ...s.weather, realized: weather } }, gameData, Rng.fromSeed(seed));
}

function setStatus(s: GameState, plotId: number, status: PlotStatus): GameState {
  return { ...s, plots: s.plots.map((p) => (p.id === plotId ? { ...p, status } : p)) };
}

const health = (s: GameState, plot = 0) => s.plots[plot]?.crop?.health;
const certain = withCrop({ storm: { ...data.crop.storm, floweringLossChance: 1, lodgingChanceBase: 1 } });

describe("water stress", () => {
  it("growing crop outside the optimal band loses stressHealthPerDay", () => {
    const s = night(stateWithCrops({ 0: crop({ growth: TILLERING, water: 0 }), 1: crop({ growth: TILLERING, water: 55 }) }), "cloudy");
    expect(health(s, 0)).toBeCloseTo(1 - data.crop.water.stressHealthPerDay, 12);
    expect(health(s, 1)).toBe(1);
  });

  it("harvestable crops no longer suffer water stress", () => {
    const s = setStatus(stateWithCrops({ 0: crop({ growth: 95, water: 0 }) }), 0, "harvestable");
    expect(health(night(s, "cloudy"), 0)).toBe(1);
  });
});

describe("storm while flowering", () => {
  it("with chance floweringLossChance, health − floweringHealthLoss", () => {
    const s = night(stateWithCrops({ 0: crop({ growth: FLOWERING, method: "transplant" }) }), "storm", withCrop({ storm: { ...data.crop.storm, floweringLossChance: 1, lodgingChanceBase: 0 } }));
    expect(health(s, 0)).toBeCloseTo(1 - data.crop.storm.floweringHealthLoss, 12);
  });

  it("only a storm, only in flowering", () => {
    const noLodge = withCrop({ storm: { ...data.crop.storm, floweringLossChance: 1, lodgingChanceBase: 0 } });
    expect(health(night(stateWithCrops({ 0: crop({ growth: FLOWERING }) }), "heavy_rain", noLodge), 0)).toBe(1);
    expect(health(night(stateWithCrops({ 0: crop({ growth: TILLERING }) }), "storm", noLodge), 0)).toBe(1);
    expect(health(night(stateWithCrops({ 0: crop({ growth: RIPENING }) }), "storm", noLodge), 0)).toBe(1);
  });

  it("happens about floweringLossChance of the time", () => {
    const gameData = withCrop({ storm: { ...data.crop.storm, lodgingChanceBase: 0 } });
    let hits = 0;
    const N = 10_000;
    for (let seed = 0; seed < N; seed++) if ((health(night(stateWithCrops({ 0: crop({ growth: FLOWERING }) }), "storm", gameData, seed), 0) ?? 1) < 1) hits++;
    expect(hits / N).toBeCloseTo(data.crop.storm.floweringLossChance, 1);
  });
});

describe("lodging (decision A6)", () => {
  it("heavy rain or storm from flowering on: − lodgingHealthLoss and marked lodged", () => {
    for (const growth of [FLOWERING, RIPENING]) {
      const s = night(stateWithCrops({ 0: crop({ growth }) }), "heavy_rain", certain);
      expect(health(s, 0)).toBeCloseTo(1 - data.crop.storm.lodgingHealthLoss, 12);
      expect(s.plots[0]?.crop?.lodged).toBe(true);
    }
  });

  it("also hits harvestable crops still in the field", () => {
    const s = setStatus(stateWithCrops({ 0: crop({ growth: 95 }) }), 0, "harvestable");
    expect(night(s, "storm", certain).plots[0]?.crop?.lodged).toBe(true);
  });

  it("not before flowering, not in light weather, at most once per crop", () => {
    expect(night(stateWithCrops({ 0: crop({ growth: TILLERING }) }), "storm", certain).plots[0]?.crop?.lodged).toBe(false);
    expect(night(stateWithCrops({ 0: crop({ growth: RIPENING }) }), "rain", certain).plots[0]?.crop?.lodged).toBe(false);
    const already = night(stateWithCrops({ 0: crop({ growth: RIPENING, lodged: true }) }), "storm", certain);
    expect(health(already, 0)).toBe(1);
  });

  it("chance = base × variety susceptibility × sowing lodgingRisk", () => {
    const rate = (varietyId: string, method: "broadcast" | "transplant") => {
      let hits = 0;
      const N = 20_000;
      for (let seed = 0; seed < N; seed++) {
        if (night(stateWithCrops({ 0: crop({ growth: RIPENING, varietyId, method }) }), "heavy_rain", data, seed).plots[0]?.crop?.lodged) hits++;
      }
      return hits / N;
    };
    const base = data.crop.storm.lodgingChanceBase;
    expect(rate("variety_b", "broadcast")).toBeCloseTo(base * 1.2 * 1.0, 2);
    expect(rate("variety_a", "transplant")).toBeCloseTo(base * 0.9 * 0.5, 2);
  });
});

describe("flood", () => {
  it("window: 1/9 (day 290) to the last game day 14/11 (day 364); the November days at game start are excluded", () => {
    expect(floodWindow(data)).toEqual({ start: 290, end: 364 });
  });

  it("happens in about yearChance of games, always inside the window, warned 3–6 days ahead, announced ±2 days", () => {
    let floods = 0;
    const N = 5_000;
    for (let seed = 0; seed < N; seed++) {
      const plan = planFlood(data, Rng.fromSeed(seed));
      if (plan.day === null) {
        expect(plan).toEqual(noFlood);
        continue;
      }
      floods++;
      expect(plan.day).toBeGreaterThanOrEqual(290);
      expect(plan.day).toBeLessThanOrEqual(364);
      expect(plan.day - (plan.warningDay ?? 0)).toBeGreaterThanOrEqual(3);
      expect(plan.day - (plan.warningDay ?? 0)).toBeLessThanOrEqual(6);
      expect(Math.abs((plan.predictedDay ?? 0) - plan.day)).toBeLessThanOrEqual(2);
    }
    expect(floods / N).toBeCloseTo(data.crop.flood.yearChance, 1);
  });

  it("is part of the initial state", () => {
    const s = createInitialState(3, data);
    const rng = Rng.fromSeed(3);
    initialWeather(data, rng); // createInitialState draws the weather first
    expect(s.flood).toEqual(planFlood(data, rng));
  });

  it("on the flood day every unharvested crop loses 0.4–0.8 health and is waterlogged", () => {
    const base = stateWithCrops({ 0: crop({ growth: TILLERING }), 2: crop({ growth: 95 }) });
    const flooded: GameState = { ...setStatus(base, 2, "harvestable"), day: 300, flood: { day: 300, warningDay: 295, predictedDay: 301 } };
    for (let seed = 0; seed < 200; seed++) {
      const s = updateHealth({ ...flooded, weather: { ...flooded.weather, realized: "cloudy" } }, withCrop({ storm: { ...data.crop.storm, lodgingChanceBase: 0 } }), Rng.fromSeed(seed));
      for (const id of [0, 2]) {
        const loss = 1 - (health(s, id) ?? 1);
        expect(loss).toBeGreaterThanOrEqual(0.4);
        expect(loss).toBeLessThan(0.8);
        expect(s.plots[id]?.crop?.water).toBe(100);
      }
      expect(s.log.at(-1)).toEqual({ day: 300, kind: "flood" });
    }
  });

  it("radio announces the predicted day the evening before warningDay", () => {
    const s: GameState = { ...createInitialState(1, data), day: 294, flood: { day: 300, warningDay: 295, predictedDay: 302 } };
    expect(announceFlood(s).log.at(-1)).toEqual({ day: 295, kind: "floodWarning", predictedDay: 302 });
    expect(announceFlood({ ...s, day: 293 }).log).toEqual(s.log);
  });
});

describe("health floor and purity", () => {
  it("health never goes below 0", () => {
    const s = night(stateWithCrops({ 0: crop({ growth: FLOWERING, health: 0.05, water: 0 }) }), "storm", certain);
    expect(health(s, 0)).toBe(0);
  });

  it("does not mutate input; deterministic", () => {
    const s = stateWithCrops({ 0: crop({ growth: FLOWERING }), 1: crop({ growth: RIPENING, water: 0 }) });
    const before = structuredClone(s);
    expect(night(s, "storm", data, 4)).toEqual(night(s, "storm", data, 4));
    expect(s).toEqual(before);
  });
});
