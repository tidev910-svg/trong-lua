import { describe, expect, it } from "vitest";
import type { GameData } from "../../../data/schemas";
import {
  careFactor,
  expectedSchedule,
  findVariety,
  stageOfGrowth,
  stageThresholds,
  updateGrowth,
} from "../../../core/systems/growth";
import type { CropStage, GameState } from "../../../core/types";
import { crop, data, stateWithCrops } from "../../helpers";

const A = findVariety("variety_a", data);
const B = findVariety("variety_b", data);

/** Every month grows at exactly 1 growth day per night. */
const flatRate: GameData = {
  ...data,
  crop: {
    ...data.crop,
    growthRateByMonth: Object.fromEntries(Object.keys(data.crop.growthRateByMonth).map((k) => [k, 1])) as GameData["crop"]["growthRateByMonth"],
  },
};

/** Runs night-step-3 on its own from `day` until plot 0 is harvestable; returns the stage entry days seen each morning. */
function growUntilHarvestable(state: GameState, gameData: GameData, keep: (s: GameState) => GameState = (s) => s) {
  const seen: Partial<Record<CropStage, number>> = {};
  let s = state;
  for (let guard = 0; guard < 400; guard++) {
    const c = s.plots[0]?.crop;
    if (!c) throw new Error("no crop");
    const stage = stageOfGrowth(c.growth, findVariety(c.varietyId, gameData), gameData);
    seen[stage] ??= s.day;
    if (s.plots[0]?.status === "harvestable") return { state: s, seen };
    s = { ...updateGrowth(keep(s), gameData), day: s.day + 1 };
  }
  throw new Error("never became harvestable");
}

describe("stage thresholds (spec §4: fixed reproductive stages, vegetative stretches by variety)", () => {
  it("variety A (90 days): tillering 7, panicle 30, flowering 55, ripening 62, harvestable 90", () => {
    expect(stageThresholds(A, data)).toEqual({
      germination: 0,
      tillering: 7,
      panicle: 30,
      flowering: 55,
      ripening: 62,
      harvestable: 90,
    });
  });

  it("variety B (102 days): only the vegetative part is longer", () => {
    expect(stageThresholds(B, data)).toEqual({
      germination: 0,
      tillering: 7,
      panicle: 42,
      flowering: 67,
      ripening: 74,
      harvestable: 102,
    });
  });

  it.each([
    [0, "germination"],
    [6.99, "germination"],
    [7, "tillering"],
    [29.99, "tillering"],
    [30, "panicle"],
    [55, "flowering"],
    [62, "ripening"],
    [89.99, "ripening"],
    [90, "harvestable"],
    [150, "harvestable"],
  ] as const)("growth %f → %s (variety A)", (growth, stage) => {
    expect(stageOfGrowth(growth, A, data)).toBe(stage);
  });

  it("tolerates float drift when summing fractional rates", () => {
    let g = 0;
    for (let i = 0; i < 100; i++) g += 0.9; // 89.99999999999… in IEEE doubles
    expect(g).not.toBe(90);
    expect(stageOfGrowth(g, A, data)).toBe("harvestable");
  });
});

describe("careFactor (product of water stress and low health)", () => {
  const { stressGrowthFactor, min } = data.crop.water;
  const { threshold, growthFactor } = data.crop.lowHealthCare;

  it.each([
    ["healthy, good water", { water: 55, health: 1 }, 1],
    ["water too low", { water: min - 1, health: 1 }, stressGrowthFactor],
    ["flooded", { water: 100, health: 1 }, stressGrowthFactor],
    ["low health", { water: 55, health: threshold - 0.01 }, growthFactor],
    ["health exactly at threshold is not low", { water: 55, health: threshold }, 1],
    ["both", { water: 0, health: 0.1 }, stressGrowthFactor * growthFactor],
  ] as const)("%s", (_label, overrides, expected) => {
    expect(careFactor(crop(overrides), data)).toBeCloseTo(expected, 12);
  });
});

describe("updateGrowth (night step 3)", () => {
  it("adds growthRateByMonth of the current day's month × careFactor", () => {
    const jan = { ...stateWithCrops({ 0: crop(), 1: crop({ water: 0 }) }), day: 47 };
    const next = updateGrowth(jan, data);
    expect(next.plots[0]?.crop?.growth).toBeCloseTo(data.crop.growthRateByMonth["1"], 12);
    expect(next.plots[1]?.crop?.growth).toBeCloseTo(data.crop.growthRateByMonth["1"] * data.crop.water.stressGrowthFactor, 12);
    const jul = updateGrowth({ ...jan, day: 228 }, data);
    expect(jul.plots[0]?.crop?.growth).toBeCloseTo(data.crop.growthRateByMonth["7"], 12);
  });

  it("marks the crop harvestable from the next morning when it reaches the base duration", () => {
    const s = { ...stateWithCrops({ 0: crop({ growth: 89.5 }) }), day: 200 };
    const next = updateGrowth(s, data);
    expect(next.plots[0]?.status).toBe("harvestable");
    expect(next.plots[0]?.crop?.harvestableDay).toBe(201);
  });

  it("ignores empty and already-harvestable plots, and does not mutate input", () => {
    const base = stateWithCrops({ 0: crop({ growth: 95, harvestableDay: 10 }) });
    const s: GameState = { ...base, plots: base.plots.map((p) => (p.id === 0 ? { ...p, status: "harvestable" } : p)) };
    const before = structuredClone(s);
    const next = updateGrowth(s, data);
    expect(next.plots).toEqual(s.plots);
    expect(s).toEqual(before);
  });
});

describe("days to each stage by variety and month", () => {
  it("at a flat rate of 1/night, variety A and B take exactly their base duration, stage by stage", () => {
    for (const v of [A, B]) {
      const { seen } = growUntilHarvestable(stateWithCrops({ 0: crop({ varietyId: v.id }) }), flatRate);
      expect(seen).toEqual(stageThresholds(v, data));
      expect(expectedSchedule(0, v.id, flatRate)).toEqual(stageThresholds(v, data));
    }
  });

  // Hand-computed from growthRateByMonth:
  // A sown 17/11 (day 2): Nov 14×0.95 = 13.3, Dec 31×0.9 = 27.9, Jan 31×0.9 = 27.9 → 69.1;
  //   Feb 0.92: 20.9 more needs 23 nights (days 78–100) → harvestable morning of day 101.
  // B sown day 2: … Feb 28×0.92 = 25.76 → 94.86; Mar 1.0: 7.14 more needs 8 nights (106–113) → day 114.
  // A sown 1/7 (day 228): Jul 31×1.05 + Aug 31×1.05 = 65.1; Sep 1.0: 24.9 more needs 25 nights (290–314) → day 315.
  it.each([
    ["A in Đông Xuân (cool months stretch it)", "variety_a", 2, 101],
    ["B in Đông Xuân", "variety_b", 2, 114],
    ["A in Thu Đông (warm months shorten it)", "variety_a", 228, 315],
  ])("%s", (_label, varietyId, sowDay, harvestableDay) => {
    const start = { ...stateWithCrops({ 0: crop({ varietyId, sowDay }) }), day: sowDay };
    const { state } = growUntilHarvestable(start, data);
    expect(state.plots[0]?.crop?.harvestableDay).toBe(harvestableDay);
    expect(state.day).toBe(harvestableDay);
    expect(expectedSchedule(sowDay, varietyId, data).harvestable).toBe(harvestableDay);
  });

  it("with good care the real growth follows the public schedule exactly", () => {
    const start = { ...stateWithCrops({ 0: crop({ varietyId: "variety_b", sowDay: 120 }) }), day: 120 };
    const { seen } = growUntilHarvestable(start, data);
    expect(seen).toEqual(expectedSchedule(120, "variety_b", data));
  });

  it("water stress slows the crop, so it ripens later than the public schedule", () => {
    const start = { ...stateWithCrops({ 0: crop({ sowDay: 2, water: 0 }) }), day: 2 };
    const { state } = growUntilHarvestable(start, data);
    expect(state.plots[0]?.crop?.harvestableDay ?? 0).toBeGreaterThan(expectedSchedule(2, "variety_a", data).harvestable + 20);
  });

  it("the schedule can run past the end of the game year", () => {
    expect(expectedSchedule(350, "variety_b", data).harvestable).toBeGreaterThan(364);
  });
});
