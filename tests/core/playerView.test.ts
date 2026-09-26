import { describe, expect, it } from "vitest";
import { applyAction } from "../../core/actions";
import { createInitialState } from "../../core/init";
import { ripenessOf } from "../../core/field";
import { getPlayerView } from "../../core/playerView";
import type { GameState } from "../../core/types";
import { crop, data, stateWithCrops } from "../helpers";

/** Changes only what the player cannot know. */
function scrambleHidden(s: GameState): GameState {
  return {
    ...s,
    rngState: (s.rngState + 12345) >>> 0,
    weather: { ...s.weather, queue: ["storm", "storm", "storm"] },
    flood: { ...s.flood, day: 333 },
    plots: s.plots.map((p) =>
      p.crop === null
        ? p
        : {
            ...p,
            status: p.status === "growing" ? "harvestable" : p.status,
            crop: {
              ...p.crop,
              pests: { brown_planthopper: 0.9, rice_blast: 0.7 },
              health: 0.1,
              growth: 88,
              water: 3,
              lodged: true,
              harvestableDay: 99,
              preventiveUntil: { rice_blast: 50 },
            },
          },
    ),
  };
}

describe("getPlayerView hides what the player cannot know", () => {
  const base = { ...stateWithCrops({ 0: crop({ sowDay: 0, growth: 20, pests: { brown_planthopper: 0.2, rice_blast: 0 } }), 3: crop({ sowDay: 5 }) }), day: 30 };

  it("states differing only in hidden fields give identical views", () => {
    expect(getPlayerView(scrambleHidden(base), data)).toEqual(getPlayerView(base, data));
  });

  it("carries no raw hidden values", () => {
    const json = JSON.stringify(getPlayerView(base, data));
    for (const key of ["rngState", "queue", "\"pests\"", "\"health\"", "\"growth\"", "\"water\"", "lodged", "harvestableDay", "preventiveUntil"]) {
      expect(json).not.toContain(key);
    }
  });

  it("a crop that is really ready still shows as planted until visited", () => {
    const ready: GameState = { ...base, plots: base.plots.map((p) => (p.id === 0 ? { ...p, status: "harvestable" } : p)) };
    expect(getPlayerView(ready, data).plots[0]?.status).toBe("planted");
  });

  it("shows forecasts, not the true weather ahead", () => {
    const view = getPlayerView(base, data);
    expect(view.weather.forecast).toEqual(base.weather.forecast);
    expect(view.weather).not.toHaveProperty("queue");
  });

  it("the flood date appears only once the radio announces it, and only as the predicted day", () => {
    const planned: GameState = { ...base, flood: { day: 300, warningDay: 295, predictedDay: 302 } };
    expect(getPlayerView({ ...planned, day: 294 }, data).radio.floodWarning).toBeNull();
    expect(getPlayerView({ ...planned, day: 295 }, data).radio.floodWarning).toEqual({ predictedDay: 302 });
  });

  it("only regional alerts that are on today are on the radio", () => {
    const s: GameState = { ...base, regionalAlerts: [{ pestId: "rice_blast", startDay: 31, endDay: 44 }] };
    expect(getPlayerView(s, data).radio.pestAlerts).toEqual([]);
    expect(getPlayerView({ ...s, day: 31 }, data).radio.pestAlerts).toHaveLength(1);
  });
});

describe("ripenessOf (true ripeness seen in the field)", () => {
  it("growth over the harvestable threshold; exactly 1 from harvestable, with the stage tolerance", () => {
    expect(ripenessOf(0, 90)).toBe(0);
    expect(ripenessOf(45, 90)).toBe(0.5);
    expect(ripenessOf(90 - 1e-12, 90)).toBe(1);
    expect(ripenessOf(120, 90)).toBe(1);
  });
});

describe("getPlayerView shows what the player does know", () => {
  it("field knowledge is from the last visit, not live", () => {
    let s = { ...stateWithCrops({ 0: crop({ sowDay: 0, growth: 20, pests: { brown_planthopper: 0.4, rice_blast: 0 } }) }), day: 20 };
    const visited = applyAction(s, { type: "chooseActivity", activity: "field" }, data);
    if (!visited.ok) throw new Error(visited.reason);
    s = visited.state;
    const known = getPlayerView(s, data).plots[0]?.known;
    expect(known).toMatchObject({ lastVisitDay: 20, stage: "tillering", waterLevel: "ok", healthBand: "Tốt", signs: { brown_planthopper: "medium", rice_blast: null } });
    expect(known?.ripeness).toBeCloseTo(20 / 90, 12); // true growth 20 of variety A's harvestable 90, seen that day
    const later = scrambleHidden({ ...s, day: 25 });
    expect(getPlayerView(later, data).plots[0]?.known).toEqual(known);
  });

  it("public schedule, money, loans, market and credit limits", () => {
    const view = getPlayerView(stateWithCrops({ 1: crop({ sowDay: 2 }) }), data);
    expect(view.plots[1]?.crop?.expected.harvestable).toBe(101);
    expect(view.cash).toBe(3_000_000);
    expect(view.loans.map((l) => l.kind)).toEqual(["family", "rent"]);
    expect(view.market.traderPricePerKg.variety_a).toBeGreaterThan(0);
    expect(view.credit).toMatchObject({ storeCreditOpen: true, loanSharkOpen: true, loanSharkMax: 10_000_000 });
    expect(view.date).toEqual({ month: 11, dayOfMonth: 15 });
    expect(view.summary).toBeNull();
  });

  it("days to Tết, then null once it has passed", () => {
    const s = createInitialState(1, data);
    expect(getPlayerView(s, data).daysToTet).toBe(data.calendar.tetDay);
    expect(getPlayerView({ ...s, day: data.calendar.tetDay }, data).daysToTet).toBe(0);
    expect(getPlayerView({ ...s, day: data.calendar.tetDay + 1 }, data).daysToTet).toBeNull();
  });

  it("shows the summary once the run is over", () => {
    const over: GameState = { ...createInitialState(1, data), phase: { kind: "gameOver", reason: "quit" } };
    expect(getPlayerView(over, data).summary).toMatchObject({ endReason: "quit", seed: 1, netWorth: 3_000_000 - 10_000_000 });
  });
});
