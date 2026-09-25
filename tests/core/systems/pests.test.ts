import { describe, expect, it } from "vitest";
import type { GameData, PestData, WeatherState } from "../../../data/schemas";
import { Rng } from "../../../core/rng";
import {
  findPest,
  isAlertActive,
  signLevel,
  sprayCure,
  sprayPreventive,
  updatePests,
  updateRegionalAlerts,
} from "../../../core/systems/pests";
import type { CropState, GameState } from "../../../core/types";
import { crop, data, stateWithCrops } from "../../helpers";

const BPH = findPest("brown_planthopper", data);
const BLAST = findPest("rice_blast", data);
// Growth values for variety A: tillering 7–30, panicle 30–55, flowering 55–62.
const TILLERING = 10;
const FLOWERING = 57;

function withPest(patch: Partial<PestData>, id = BPH.id): GameData {
  return { ...data, pests: data.pests.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

function night(s: GameState, weather: WeatherState, gameData: GameData = data, seed = 1): GameState {
  return updatePests({ ...s, weather: { ...s.weather, realized: weather } }, gameData, Rng.fromSeed(seed));
}

const pests = (bph: number, blast = 0) => ({ brown_planthopper: bph, rice_blast: blast });
const d = (s: GameState, plot: number, pest = BPH.id) => s.plots[plot]?.crop?.pests[pest];

describe("appearing (density 0)", () => {
  it("appears at initialDensity with probability spawnChance", () => {
    const gameData = withPest({ spawnChance: 0.3 });
    let hits = 0;
    const N = 20_000;
    for (let seed = 0; seed < N; seed++) {
      const v = d(night(stateWithCrops({ 0: crop({ growth: TILLERING }) }), "cloudy", gameData, seed), 0);
      if (v !== 0) {
        expect(v).toBe(BPH.initialDensity);
        hits++;
      }
    }
    expect(hits / N).toBeCloseTo(0.3, 1);
  });

  it("a regional alert multiplies the chance by spawnMultiplier", () => {
    const gameData = withPest({ spawnChance: 0.1 });
    const base = stateWithCrops({ 0: crop({ growth: TILLERING }) });
    const alerted: GameState = { ...base, regionalAlerts: [{ pestId: BPH.id, startDay: 0, endDay: 5 }] };
    let hits = 0;
    const N = 20_000;
    for (let seed = 0; seed < N; seed++) if (d(night(alerted, "cloudy", gameData, seed), 0) !== 0) hits++;
    expect(hits / N).toBeCloseTo(0.1 * BPH.regionalAlert.spawnMultiplier, 1);
  });

  it("does not also grow on the night it appears", () => {
    const s = night(stateWithCrops({ 0: crop({ growth: TILLERING }) }), "sunny", withPest({ spawnChance: 1 }));
    expect(d(s, 0)).toBe(BPH.initialDensity);
  });
});

describe("growing (density > 0)", () => {
  it("density += density × growthRate × weatherFactor × susceptibility × stageFactor", () => {
    const s = night(stateWithCrops({ 0: crop({ growth: TILLERING, pests: pests(0.1) }) }), "sunny");
    expect(d(s, 0)).toBeCloseTo(0.1 + 0.1 * 0.12 * 1.2 * 1.0 * 1.0, 12);
  });

  it("uses the variety's susceptibility and the crop's stage", () => {
    const c = crop({ varietyId: "variety_b", growth: 70, pests: pests(0, 0.1) }); // B: flowering 67–74
    const s = night(stateWithCrops({ 0: c }), "rain");
    expect(d(s, 0, BLAST.id)).toBeCloseTo(0.1 + 0.1 * 0.1 * 1.4 * 1.3 * 1.5, 12);
  });

  it("a preventive spray multiplies growth by preventiveFactor while it lasts", () => {
    const sprayed = sprayPreventive(crop({ growth: TILLERING, pests: pests(0.1) }), BPH.id, 3, data);
    expect(sprayed.preventiveUntil[BPH.id]).toBe(3 + BPH.preventiveDays - 1);
    const onDay = (day: number) => d(night({ ...stateWithCrops({ 0: sprayed }), day }, "cloudy"), 0);
    expect(onDay(3)).toBeCloseTo(0.1 + 0.1 * 0.12 * BPH.preventiveFactor, 12);
    expect(onDay(3 + BPH.preventiveDays - 1)).toBeCloseTo(0.1 + 0.1 * 0.12 * BPH.preventiveFactor, 12);
    expect(onDay(3 + BPH.preventiveDays)).toBeCloseTo(0.1 + 0.1 * 0.12, 12);
  });

  it("is capped at 1", () => {
    expect(d(night(stateWithCrops({ 0: crop({ growth: FLOWERING, pests: pests(0.99) }) }), "sunny"), 0)).toBe(1);
  });

  it("only runs on growing plots", () => {
    const base = stateWithCrops({ 0: crop({ growth: 95, pests: pests(0.5) }) });
    const harvestable: GameState = { ...base, plots: base.plots.map((p) => (p.id === 0 ? { ...p, status: "harvestable" } : p)) };
    expect(night(harvestable, "sunny", withPest({ spawnChance: 1 })).plots).toEqual(harvestable.plots);
  });
});

describe("spreading to neighbors (plots in a row, ±1)", () => {
  const spreadAlways = withPest({ spreadChance: 1, growthRate: 0, spawnChance: 0 });

  it("above spreadThreshold, infects growing neighbors at initialDensity", () => {
    const s = night(
      stateWithCrops({ 1: crop({ growth: TILLERING }), 2: crop({ growth: TILLERING, pests: pests(0.5) }), 3: crop({ growth: TILLERING }) }),
      "cloudy",
      spreadAlways,
    );
    expect([d(s, 1), d(s, 2), d(s, 3)]).toEqual([BPH.initialDensity, 0.5, BPH.initialDensity]);
  });

  it("never lowers a neighbor's density, and needs density strictly above the threshold", () => {
    const s = night(
      stateWithCrops({
        0: crop({ growth: TILLERING, pests: pests(0.3) }),
        1: crop({ growth: TILLERING, pests: pests(0.5) }),
        3: crop({ growth: TILLERING, pests: pests(BPH.spreadThreshold) }),
        4: crop({ growth: TILLERING }),
      }),
      "cloudy",
      spreadAlways,
    );
    expect(d(s, 0)).toBe(0.3);
    expect(d(s, 4)).toBe(0);
  });

  it("skips empty neighbors", () => {
    const s = night(stateWithCrops({ 0: crop({ growth: TILLERING, pests: pests(0.9) }) }), "cloudy", spreadAlways);
    expect(s.plots[1]?.crop).toBeNull();
  });

  it("uses densities from before spreading (plot order does not matter)", () => {
    // Plot 0 gets infected by plot 1 this night, but must not pass it on further the same night.
    const s = night(
      stateWithCrops({ 0: crop({ growth: TILLERING }), 1: crop({ growth: TILLERING, pests: pests(0.9) }), 2: crop({ growth: TILLERING }) }),
      "cloudy",
      withPest({ spreadChance: 1, growthRate: 0, spawnChance: 0, initialDensity: 0.9 }),
    );
    expect([d(s, 0), d(s, 2)]).toEqual([0.9, 0.9]);
  });

  it("spreads with probability spreadChance", () => {
    let hits = 0;
    const N = 10_000;
    const gameData = withPest({ growthRate: 0, spawnChance: 0 });
    for (let seed = 0; seed < N; seed++) {
      const s = night(stateWithCrops({ 0: crop({ growth: TILLERING, pests: pests(0.5) }), 1: crop({ growth: TILLERING }) }), "cloudy", gameData, seed);
      if (d(s, 1) !== 0) hits++;
    }
    expect(hits / N).toBeCloseTo(BPH.spreadChance, 1);
  });
});

describe("damage", () => {
  const still = withPest({ growthRate: 0, spawnChance: 0 });

  it("above damageThreshold: health −= damagePerDay × density", () => {
    const s = night(stateWithCrops({ 0: crop({ growth: TILLERING, pests: pests(0.5) }) }), "cloudy", still);
    expect(s.plots[0]?.crop?.health).toBeCloseTo(1 - BPH.damagePerDay * 0.5, 12);
  });

  it("no damage at or below the threshold; both pests add up; floor 0", () => {
    const at = night(stateWithCrops({ 0: crop({ growth: TILLERING, pests: pests(BPH.damageThreshold) }) }), "cloudy", still);
    expect(at.plots[0]?.crop?.health).toBe(1);
    const both = night(
      stateWithCrops({ 0: crop({ growth: TILLERING, pests: pests(0.5, 0.5) }) }),
      "cloudy",
      withPest({ growthRate: 0, spawnChance: 0 }, BLAST.id),
    );
    expect(both.plots[0]?.crop?.health).toBeCloseTo(1 - 0.06 * 0.5 - 0.07 * 0.5, 2);
    const low = night(stateWithCrops({ 0: crop({ growth: TILLERING, health: 0.01, pests: pests(1) }) }), "cloudy", still);
    expect(low.plots[0]?.crop?.health).toBe(0);
  });
});

describe("sprays and signs", () => {
  it("cure: density ×= (1 − sprayEffectiveness), for that pest only", () => {
    const c: CropState = sprayCure(crop({ pests: pests(0.5, 0.5) }), BPH.id, data);
    expect(c.pests.brown_planthopper).toBeCloseTo(0.5 * (1 - BPH.sprayEffectiveness), 12);
    expect(c.pests.rice_blast).toBe(0.5);
  });

  it.each([
    [0, null],
    [0.149, null],
    [0.15, "light"],
    [0.349, "light"],
    [0.35, "medium"],
    [0.6, "heavy"],
    [1, "heavy"],
  ] as const)("planthopper density %f → sign %s", (density, level) => {
    expect(signLevel(density, BPH)).toBe(level);
  });

  it("rejects unknown pests", () => {
    expect(() => sprayCure(crop(), "stem_borer", data)).toThrow(/unknown pest/);
  });
});

describe("regional alerts (night step 6)", () => {
  const always = (id: string) => withPest({ regionalAlert: { ...findPest(id, data).regionalAlert, chancePerDayByMonth: Object.fromEntries(Object.keys(BPH.regionalAlert.chancePerDayByMonth).map((k) => [k, 1])) as PestData["regionalAlert"]["chancePerDayByMonth"] } }, id);

  it("starts tomorrow and lasts durationDays", () => {
    const s = updateRegionalAlerts({ ...stateWithCrops({}), day: 10 }, always(BPH.id), Rng.fromSeed(1));
    expect(s.regionalAlerts).toContainEqual({ pestId: BPH.id, startDay: 11, endDay: 10 + BPH.regionalAlert.durationDays });
    expect(isAlertActive(s.regionalAlerts, BPH.id, 10)).toBe(false);
    expect(isAlertActive(s.regionalAlerts, BPH.id, 11)).toBe(true);
    expect(isAlertActive(s.regionalAlerts, BPH.id, 24)).toBe(true);
    expect(isAlertActive(s.regionalAlerts, BPH.id, 25)).toBe(false);
  });

  it("at most one alert per pest at a time; finished alerts are dropped", () => {
    const active: GameState = { ...stateWithCrops({}), day: 10, regionalAlerts: [{ pestId: BPH.id, startDay: 5, endDay: 12 }] };
    const s = updateRegionalAlerts(active, always(BPH.id), Rng.fromSeed(1));
    expect(s.regionalAlerts.filter((a) => a.pestId === BPH.id)).toEqual([{ pestId: BPH.id, startDay: 5, endDay: 12 }]);
    const ended = updateRegionalAlerts({ ...active, day: 12 }, withPest({}), Rng.fromSeed(1));
    expect(ended.regionalAlerts.some((a) => a.startDay === 5)).toBe(false);
  });

  it("frequency follows chancePerDayByMonth of the current month", () => {
    let hits = 0;
    const N = 20_000;
    for (let seed = 0; seed < N; seed++) {
      const s = updateRegionalAlerts({ ...stateWithCrops({}), day: 228 }, data, Rng.fromSeed(seed)); // July
      if (s.regionalAlerts.some((a) => a.pestId === BLAST.id)) hits++;
    }
    expect(hits / N).toBeCloseTo(BLAST.regionalAlert.chancePerDayByMonth["7"], 2);
  });
});

describe("determinism", () => {
  it("same state and seed → same result; input not mutated", () => {
    const s = stateWithCrops({ 0: crop({ growth: TILLERING, pests: pests(0.5, 0.2) }), 1: crop({ growth: FLOWERING }) });
    const before = structuredClone(s);
    expect(night(s, "rain", data, 9)).toEqual(night(s, "rain", data, 9));
    expect(s).toEqual(before);
  });
});
