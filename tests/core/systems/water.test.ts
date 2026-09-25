import { describe, expect, it } from "vitest";
import { WEATHER_STATES, type WeatherState } from "../../../data/schemas";
import { adjustedWater, isWaterStressed, updateWater, waterLevel } from "../../../core/systems/water";
import type { GameState } from "../../../core/types";
import { crop, data, stateWithCrops } from "../../helpers";

/** Plot 0 and 2 planted with the given water levels, the rest empty; `realized` set. */
function stateWith(realized: WeatherState | null, water0: number, water2: number): GameState {
  const s = stateWithCrops({ 0: crop({ water: water0 }), 2: crop({ water: water2 }) });
  return { ...s, weather: { ...s.weather, realized } };
}

describe("updateWater (night step 2)", () => {
  it.each(WEATHER_STATES)("%s moves water by deltaByWeather", (w) => {
    const next = updateWater(stateWith(w, 55, 50), data);
    const delta = data.crop.water.deltaByWeather[w];
    expect(next.plots[0]?.crop?.water).toBe(55 + delta);
    expect(next.plots[2]?.crop?.water).toBe(50 + delta);
  });

  it("clamps to 0–100", () => {
    expect(updateWater(stateWith("sunny", 3, 0), data).plots.map((p) => p.crop?.water)).toEqual([
      0,
      undefined,
      0,
      undefined,
      undefined,
    ]);
    expect(updateWater(stateWith("storm", 90, 100), data).plots[0]?.crop?.water).toBe(100);
    expect(updateWater(stateWith("storm", 90, 100), data).plots[2]?.crop?.water).toBe(100);
  });

  it("leaves plots without a crop untouched", () => {
    const s = stateWith("rain", 55, 55);
    const next = updateWater(s, data);
    for (const id of [1, 3, 4]) expect(next.plots[id]).toBe(s.plots[id]);
  });

  it("uses the weather realized by night step 1 and refuses to run before it", () => {
    expect(() => updateWater(stateWith(null, 55, 55), data)).toThrow(/after advanceWeather/);
  });

  it("does not mutate the input", () => {
    const s = stateWith("heavy_rain", 55, 55);
    const before = structuredClone(s);
    updateWater(s, data);
    expect(s).toEqual(before);
  });

  it("reads deltas from data", () => {
    const custom = { ...data, crop: { ...data.crop, water: { ...data.crop.water, deltaByWeather: { ...data.crop.water.deltaByWeather, rain: -30 } } } };
    expect(updateWater(stateWith("rain", 55, 55), custom).plots[0]?.crop?.water).toBe(25);
  });
});

describe("water level (optimal band [water.min, water.max] inclusive)", () => {
  const { min, max } = data.crop.water;
  it.each([
    [0, "low"],
    [min - 1, "low"],
    [min, "ok"],
    [55, "ok"],
    [max, "ok"],
    [max + 1, "flooded"],
    [100, "flooded"],
  ] as const)("%i → %s", (water, level) => {
    expect(waterLevel(water, data)).toBe(level);
    expect(isWaterStressed(water, data)).toBe(level !== "ok");
  });

  it("adjusting water brings it to adjustTarget", () => {
    expect(adjustedWater(data)).toBe(data.crop.water.adjustTarget);
    expect(waterLevel(adjustedWater(data), data)).toBe("ok");
  });
});
