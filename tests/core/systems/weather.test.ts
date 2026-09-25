import { describe, expect, it } from "vitest";
import { loadData } from "../../../data/loadData";
import { WEATHER_STATES, type GameData, type WeatherState } from "../../../data/schemas";
import { createInitialState } from "../../../core/init";
import { Rng } from "../../../core/rng";
import { monthKeyOfDay } from "../../../core/systems/calendar";
import {
  advanceWeather,
  drawWeather,
  forecastOf,
  forecastQueue,
  initialWeather,
} from "../../../core/systems/weather";
import type { GameState } from "../../../core/types";

const data = loadData();
const N = 50_000;
const JAN_DAY = 47; // 1/1
const FEB_DAY = 78; // 1/2
const JUL_DAY = 228; // 1/7

function withWeather(patch: Partial<GameData["weather"]>): GameData {
  return { ...data, weather: { ...data.weather, ...patch } };
}

function frequencies(samples: WeatherState[]): Record<WeatherState, number> {
  const out = { sunny: 0, cloudy: 0, rain: 0, heavy_rain: 0, storm: 0 };
  for (const s of samples) out[s] += 1 / samples.length;
  return out;
}

function drawsUsed(fn: (rng: Rng) => unknown): number {
  const rng = Rng.fromSeed(77);
  fn(rng);
  const probe = Rng.fromSeed(77);
  for (let n = 0; n < 10; n++) {
    if (probe.state === rng.state) return n;
    probe.nextUint32();
  }
  throw new Error("more than 10 draws");
}

describe("drawWeather (spec §6: persistence, else the month's distribution)", () => {
  it("with persistence 1 always keeps yesterday, even a state impossible this month", () => {
    const d = withWeather({ persistence: 1 });
    const rng = Rng.fromSeed(1);
    for (let i = 0; i < 1000; i++) expect(drawWeather("storm", FEB_DAY, d, rng)).toBe("storm");
  });

  it("with persistence 0 follows the month's distribution; zero-probability states never appear", () => {
    const d = withWeather({ persistence: 0 });
    const rng = Rng.fromSeed(2);
    const freq = frequencies(Array.from({ length: N }, () => drawWeather("storm", FEB_DAY, d, rng)));
    const feb = data.weather.distributionByMonth["2"];
    for (const w of WEATHER_STATES) expect(freq[w]).toBeCloseTo(feb[w], 2);
    expect(freq.storm).toBe(0);
    expect(freq.heavy_rain).toBe(0);
  });

  it("P(same as yesterday) = persistence + (1 − persistence) × P_month(yesterday)", () => {
    const rng = Rng.fromSeed(3);
    let same = 0;
    for (let i = 0; i < N; i++) if (drawWeather("sunny", JAN_DAY, data, rng) === "sunny") same++;
    const p = data.weather.persistence;
    expect(same / N).toBeCloseTo(p + (1 - p) * data.weather.distributionByMonth["1"].sunny, 2);
  });

  it("uses the month of the day being drawn", () => {
    const d = withWeather({ persistence: 0 });
    const rng = Rng.fromSeed(4);
    const jan = frequencies(Array.from({ length: N }, () => drawWeather(null, JAN_DAY, d, rng)));
    const jul = frequencies(Array.from({ length: N }, () => drawWeather(null, JUL_DAY, d, rng)));
    expect(jan.sunny).toBeCloseTo(data.weather.distributionByMonth["1"].sunny, 2);
    expect(jul.sunny).toBeCloseTo(data.weather.distributionByMonth["7"].sunny, 2);
  });

  it("draw count: 1 with no previous day; 1 if kept; 2 if redrawn", () => {
    expect(drawsUsed((r) => drawWeather(null, 0, data, r))).toBe(1);
    expect(drawsUsed((r) => drawWeather("sunny", 0, withWeather({ persistence: 1 }), r))).toBe(1);
    expect(drawsUsed((r) => drawWeather("sunny", 0, withWeather({ persistence: 0 }), r))).toBe(2);
  });
});

describe("forecastOf (right with forecastAccuracy, else a neighbor)", () => {
  const accuracies = [
    ["today", data.weather.forecastAccuracy.today],
    ["plus1", data.weather.forecastAccuracy.plus1],
    ["plus2", data.weather.forecastAccuracy.plus2],
  ] as const;

  it.each(accuracies)("%s forecast is right ≈ %f of the time", (_label, accuracy) => {
    const rng = Rng.fromSeed(5);
    let right = 0;
    for (let i = 0; i < N; i++) {
      const truth = WEATHER_STATES[i % WEATHER_STATES.length] ?? "sunny";
      const f = forecastOf(truth, 10, accuracy, data, rng);
      if (f.predicted === truth) right++;
      else expect(data.weather.neighbors[truth]).toContain(f.predicted);
      expect(f.accuracy).toBe(accuracy);
      expect(f.day).toBe(10);
    }
    expect(right / N).toBeCloseTo(accuracy, 2);
  });

  it("a wrong forecast picks uniformly among the neighbors", () => {
    const rng = Rng.fromSeed(6);
    const freq = frequencies(Array.from({ length: N }, () => forecastOf("cloudy", 0, 0, data, rng).predicted));
    expect(freq.sunny).toBeCloseTo(0.5, 2);
    expect(freq.rain).toBeCloseTo(0.5, 2);
    expect(freq.cloudy).toBe(0);
  });

  it("single-neighbor states always get that neighbor when wrong", () => {
    const rng = Rng.fromSeed(7);
    for (let i = 0; i < 100; i++) {
      expect(forecastOf("storm", 0, 0, data, rng).predicted).toBe("heavy_rain");
      expect(forecastOf("sunny", 0, 0, data, rng).predicted).toBe("cloudy");
    }
  });

  it("forecastQueue gives today / +1 / +2 their own accuracy and day", () => {
    const f = forecastQueue(["rain", "rain", "rain"], 20, data, Rng.fromSeed(8));
    expect(f.map((x) => [x.day, x.accuracy])).toEqual([
      [20, 0.85],
      [21, 0.7],
      [22, 0.55],
    ]);
  });
});

describe("initialWeather and createInitialState", () => {
  it("queues days 0–2, forecasts days 0–2, nothing realized yet", () => {
    const w = initialWeather(data, Rng.fromSeed(9));
    expect(w.queue).toHaveLength(3);
    expect(w.forecast.map((f) => f.day)).toEqual([0, 1, 2]);
    expect(w.realized).toBeNull();
  });

  it("day-0 weather across many seeds follows the November distribution", () => {
    const samples = Array.from({ length: 20_000 }, (_, seed) => createInitialState(seed, data).weather.queue[0]);
    const freq = frequencies(samples);
    const nov = data.weather.distributionByMonth["11"];
    for (const w of WEATHER_STATES) expect(freq[w]).toBeCloseTo(nov[w], 1);
  });
});

describe("advanceWeather (night step 1)", () => {
  it("realizes today, shifts the queue, draws day + 3 and forecasts day + 1 … day + 3", () => {
    const s = createInitialState(10, data);
    const next = advanceWeather(s, data, Rng.fromState(s.rngState));
    expect(next.weather.realized).toBe(s.weather.queue[0]);
    expect(next.weather.queue.slice(0, 2)).toEqual(s.weather.queue.slice(1));
    expect(next.weather.forecast.map((f) => f.day)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input and is deterministic", () => {
    const s = createInitialState(11, data);
    const before = structuredClone(s);
    const a = advanceWeather(s, data, Rng.fromState(s.rngState));
    const b = advanceWeather(s, data, Rng.fromState(s.rngState));
    expect(s).toEqual(before);
    expect(a).toEqual(b);
  });

  it("works through the last game day (look-ahead goes past day 364)", () => {
    let s: GameState = { ...createInitialState(12, data), day: 362 };
    const rng = Rng.fromState(s.rngState);
    for (; s.day <= 364; s = { ...s, day: s.day + 1 }) s = advanceWeather(s, data, rng);
    expect(s.weather.forecast.map((f) => f.day)).toEqual([365, 366, 367]);
  });

  it("over whole simulated years: morning forecasts hit their accuracy and months follow their distribution", () => {
    const hits = [0, 0, 0];
    let total = 0;
    const julySamples: WeatherState[] = [];
    for (let seed = 0; seed < 300; seed++) {
      let s = createInitialState(seed, data);
      const rng = Rng.fromState(s.rngState);
      // Forecasts made in the morning of `day` for day + k, checked when that day is realized.
      const pending = new Map<number, WeatherState[]>();
      for (let day = 0; day < data.calendar.daysInYear; day++) {
        s.weather.forecast.forEach((f, k) => {
          const list = pending.get(f.day) ?? [];
          list[k] = f.predicted;
          pending.set(f.day, list);
        });
        s = advanceWeather(s, data, rng);
        const realized = s.weather.realized;
        if (realized === null) throw new Error("no realized weather");
        const made = pending.get(day) ?? [];
        if (made.length === 3) {
          made.forEach((p, k) => {
            if (p === realized) hits[k] = (hits[k] ?? 0) + 1;
          });
          total++;
        }
        pending.delete(day);
        if (monthKeyOfDay(day, data.calendar) === "7") julySamples.push(realized);
        s = { ...s, day: day + 1 };
      }
    }
    const { today, plus1, plus2 } = data.weather.forecastAccuracy;
    expect((hits[0] ?? 0) / total).toBeCloseTo(today, 1);
    expect((hits[1] ?? 0) / total).toBeCloseTo(plus1, 1);
    expect((hits[2] ?? 0) / total).toBeCloseTo(plus2, 1);
    const july = frequencies(julySamples);
    for (const w of WEATHER_STATES) expect(july[w]).toBeCloseTo(data.weather.distributionByMonth["7"][w], 1);
  });
});
