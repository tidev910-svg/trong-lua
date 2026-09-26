import { describe, expect, it } from "vitest";
import {
  applyFertilizer,
  harvestYieldKg,
  newCrop,
  nutrientFactor,
  overdueDays,
  overdueLoss,
  sowingCost,
} from "../../../core/systems/yield";
import type { CropState } from "../../../core/types";
import { crop, data } from "../../helpers";

// Growth values that put variety A in each stage (thresholds 0/7/30/55/62/90).
const AT = { germination: 1, tillering: 10, panicle: 35, flowering: 57, ripening: 70, harvestable: 90 } as const;

describe("sowing", () => {
  it("broadcast variety A: land prep + 1.5× seed, no labor", () => {
    expect(sowingCost("variety_a", "broadcast", data)).toEqual({
      seed: 1_875_000,
      landPrep: 2_000_000,
      labor: 0,
      total: 3_875_000,
      energy: 30,
    });
  });

  it("transplant variety B: land prep + 1× seed + labor", () => {
    expect(sowingCost("variety_b", "transplant", data)).toEqual({
      seed: 1_750_000,
      landPrep: 2_000_000,
      labor: 2_000_000,
      total: 5_750_000,
      energy: 25,
    });
  });

  it("a new crop starts at growth 0, full health, starting water, no fertilizer", () => {
    expect(newCrop("variety_b", "transplant", 12, data)).toEqual({
      varietyId: "variety_b",
      method: "transplant",
      sowDay: 12,
      growth: 0,
      health: 1,
      water: data.crop.water.start,
      fertilizerApps: [],
      harvestableDay: null,
      seasonKey: "DX-1",
      pests: { brown_planthopper: 0, rice_blast: 0 },
      preventiveUntil: {},
      lodged: false,
      sprayLog: [],
    });
  });

  it("rejects unknown varieties", () => {
    expect(() => newCrop("variety_x", "broadcast", 0, data)).toThrow(/unknown variety/);
    expect(() => sowingCost("variety_x", "broadcast", data)).toThrow(/unknown variety/);
  });
});

describe("applyFertilizer (correct only in a recommended stage, first time per stage)", () => {
  it.each([
    ["germination", false],
    ["tillering", true],
    ["panicle", true],
    ["flowering", false],
    ["ripening", false],
  ] as const)("first application in %s → correct = %s", (stage, correct) => {
    const c = applyFertilizer(crop({ growth: AT[stage] }), 20, data);
    expect(c.fertilizerApps).toEqual([{ day: 20, stage, correct }]);
  });

  it("a second application in the same recommended stage is off-stage", () => {
    let c = crop({ growth: AT.tillering });
    c = applyFertilizer(c, 10, data);
    c = applyFertilizer(c, 11, data);
    expect(c.fertilizerApps.map((a) => a.correct)).toEqual([true, false]);
    c = applyFertilizer({ ...c, growth: AT.panicle }, 40, data);
    expect(c.fertilizerApps.map((a) => a.correct)).toEqual([true, false, true]);
  });

  it("cannot fertilize a harvestable crop; does not mutate", () => {
    expect(() => applyFertilizer(crop({ growth: AT.harvestable }), 0, data)).toThrow(/harvestable/);
    const c = crop({ growth: AT.tillering });
    const before = structuredClone(c);
    applyFertilizer(c, 0, data);
    expect(c).toEqual(before);
  });
});

describe("nutrientFactor (off-stage = 0.3 of a correct one, linear, capped at 2)", () => {
  const app = (correct: boolean) => ({ day: 0, stage: "tillering" as const, correct });

  it.each([
    ["none", [], 0.7],
    ["1 correct", [true], 0.85],
    ["2 correct", [true, true], 1.0],
    ["1 off-stage → 0.3", [false], 0.7 + 0.3 * 0.15],
    ["1 correct + 1 off-stage → 1.3", [true, false], 0.85 + 0.3 * 0.15],
    ["2 correct + extra off-stage → capped at 2", [true, true, false, false], 1.0],
    ["4 off-stage → 1.2", [false, false, false, false], 0.85 + 0.2 * 0.15],
  ] as const)("%s", (_label, apps, expected) => {
    expect(nutrientFactor(apps.map(app), data)).toBeCloseTo(expected, 12);
  });
});

describe("harvest yield", () => {
  const ripe = (overrides: Partial<CropState> = {}) => crop({ growth: 90, harvestableDay: 100, ...overrides });

  it("baseYield × health × nutrientFactor × method yieldFactor", () => {
    const c = ripe({
      method: "transplant",
      health: 0.9,
      fertilizerApps: [
        { day: 10, stage: "tillering", correct: true },
        { day: 40, stage: "panicle", correct: true },
      ],
    });
    expect(harvestYieldKg(c, 100, data)).toBeCloseTo(4000 * 0.9 * 1.0 * 1.05, 9);
  });

  it("the season comes from the sowing month, not the harvest month", () => {
    expect(harvestYieldKg(ripe({ sowDay: 2 }), 100, data)).toBeCloseTo(4000 * 0.7, 9); // Nov → DX
    expect(harvestYieldKg(ripe({ sowDay: 80 }), 100, data)).toBeCloseTo(3400 * 0.7, 9); // Feb → HT
    expect(harvestYieldKg(ripe({ sowDay: 228 }), 100, data)).toBeCloseTo(3100 * 0.7, 9); // Jul → TD
    expect(harvestYieldKg(ripe({ sowDay: 228, varietyId: "variety_b" }), 100, data)).toBeCloseTo(2900 * 0.7, 9);
  });

  it("the harvest window has no loss; after it 3% per day, capped at 100%", () => {
    const c = ripe(); // harvestable from day 100, window 7 days → 100–106
    expect(overdueDays(c, 100, data)).toBe(0);
    expect(overdueDays(c, 106, data)).toBe(0);
    expect(overdueDays(c, 107, data)).toBe(1);
    expect(overdueLoss(c, 107, data)).toBeCloseTo(0.03, 12);
    expect(overdueLoss(c, 116, data)).toBeCloseTo(0.3, 12);
    expect(overdueLoss(c, 200, data)).toBe(1);
    expect(harvestYieldKg(c, 107, data)).toBeCloseTo(4000 * 0.7 * 0.97, 9);
    expect(harvestYieldKg(c, 200, data)).toBe(0);
  });

  it("zero health gives zero yield (decision A16)", () => {
    expect(harvestYieldKg(ripe({ health: 0 }), 100, data)).toBe(0);
  });

  it("refuses to compute overdue loss before the crop is harvestable", () => {
    expect(() => harvestYieldKg(crop(), 100, data)).toThrow(/not harvestable/);
  });
});
