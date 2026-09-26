import { describe, expect, it } from "vitest";
import { applyAction } from "../../core/actions";
import { createInitialState } from "../../core/init";
import { runNight } from "../../core/night";
import { computeSettlement } from "../../core/settlement";
import { stopReason } from "../../core/skip";
import { netWorth, summarize } from "../../core/summary";
import { expectedSchedule } from "../../core/systems/growth";
import type { Action, GameState } from "../../core/types";
import { ALL_STOP_CONDITIONS } from "../../core/types";
import { crop, data, stateWithCrops } from "../helpers";

function act(state: GameState, action: Action): GameState {
  const result = applyAction(state, action, data);
  if (!result.ok) throw new Error(`refused ${action.type}: ${result.reason}`);
  return result.state;
}

function refused(state: GameState, action: Action): string {
  const result = applyAction(state, action, data);
  if (result.ok) throw new Error(`${action.type} was accepted`);
  expect(result.state).toBe(state);
  return result.reason;
}

const rest: Action = { type: "chooseActivity", activity: "rest" };
const field: Action = { type: "chooseActivity", activity: "field" };
const sow = (plotId: number, payWith: "cash" | "store_credit" = "cash"): Action => ({
  type: "prepareAndSow",
  plotId,
  variety: "variety_a",
  method: "broadcast",
  payWith,
});

describe("day phases (spec §2, decision B1)", () => {
  it("briefing → morning activity → afternoon activity → night → next briefing", () => {
    let s = createInitialState(1, data);
    s = act(s, rest);
    expect(s.phase).toEqual({ kind: "halfDay", slot: "afternoon", activity: null });
    expect(s.energy).toBe(100);
    s = act(s, rest);
    expect(s.day).toBe(1);
    expect(s.phase).toEqual({ kind: "briefing" });
    expect(s.cash).toBe(3_000_000 - data.economy.livingCostPerDay);
  });

  it("the night restores energy, moves the weather queue and the market, and consumes RNG", () => {
    const s0 = { ...createInitialState(2, data), energy: 10 };
    const s1 = runNight(s0, data);
    expect(s1.energy).toBe(70);
    expect(s1.weather.realized).toBe(s0.weather.queue[0]);
    expect(s1.market.deviation).not.toBe(0);
    expect(s1.rngState).not.toBe(s0.rngState);
  });

  it("the field: energy fieldVisit, every plot observed, field actions until endHalfDay", () => {
    let s = act(createInitialState(3, data), field);
    expect(s.phase).toEqual({ kind: "halfDay", slot: "morning", activity: "field" });
    expect(s.energy).toBe(95);
    expect(s.plots.every((p) => p.known?.lastVisitDay === 0)).toBe(true);
    s = act(s, { type: "endHalfDay" });
    expect(s.phase).toEqual({ kind: "halfDay", slot: "afternoon", activity: null });
  });

  it("refuses actions outside their phase and leaves the state untouched", () => {
    const s = createInitialState(4, data);
    expect(refused(s, sow(0))).toMatch(/ngoài đồng/);
    expect(refused(s, { type: "endHalfDay" })).toMatch(/ngoài đồng/);
    expect(refused(s, { type: "acknowledge" })).toMatch(/xác nhận/);
    const afternoon = act(s, rest);
    expect(refused(afternoon, { type: "skipUntil", defaultActivity: "rest", stopOn: [], maxDays: 3 })).toMatch(/bản tin/);
    const over: GameState = { ...s, phase: { kind: "gameOver", reason: "quit" } };
    expect(refused(over, rest)).toMatch(/kết thúc/);
  });

  it("hired work when there is some; refused otherwise", () => {
    const s = { ...createInitialState(5, data), hiredWorkAvailable: true };
    const worked = act(s, { type: "chooseActivity", activity: "hired_work" });
    expect(worked.cash).toBe(3_150_000);
    expect(worked.energy).toBe(65);
    expect(refused({ ...s, hiredWorkAvailable: false }, { type: "chooseActivity", activity: "hired_work" })).toMatch(/không có ai/);
  });

  it("the year ends after the night of the last day", () => {
    let s: GameState = { ...createInitialState(6, data), day: 364 };
    s = act(act(s, rest), rest);
    expect(s.phase).toEqual({ kind: "gameOver", reason: "yearEnd" });
    expect(s.day).toBe(364);
  });
});

describe("field actions", () => {
  // Sowing the whole field costs more than the starting cash: these tests start richer.
  const rich = (s: GameState) => ({ ...s, cash: 10_000_000 });
  const inField = (s: GameState = rich(createInitialState(7, data))) => act(s, field);

  it("sowing with cash: land prep + seed + labor, energy, plot growing and observed", () => {
    const s = act(inField(), sow(0));
    expect(s.cash).toBe(10_000_000 - 3_875_000);
    expect(s.energy).toBe(95 - 30);
    expect(s.plots[0]).toMatchObject({ status: "growing", known: { stage: "germination", lastVisitDay: 0 } });
    expect(s.plots[0]?.crop?.seasonKey).toBe("DX-1");
  });

  it("sowing on store credit: only the seed goes on credit, at the markup", () => {
    const s = act(inField(), sow(0, "store_credit"));
    expect(s.cash).toBe(10_000_000 - 2_000_000);
    expect(s.loans.find((l) => l.kind === "store_credit")?.balance).toBe(Math.round(1_875_000 * 1.15));
  });

  it("cannot sow a planted plot, without enough energy, or without cash", () => {
    const s = act(inField(), sow(0));
    expect(refused(s, sow(0))).toMatch(/chưa trống/);
    expect(refused({ ...inField(), energy: 29 }, sow(0))).toMatch(/sức lực/);
    expect(refused({ ...inField(), cash: 100 }, sow(0))).toMatch(/tiền mặt/);
  });

  it("fertilize, spray and adjust water cost money and energy", () => {
    let s = inField(rich(stateWithCrops({ 0: crop({ growth: 10, water: 0 }) })));
    s = act(s, { type: "fertilize", plotId: 0, payWith: "cash" });
    s = act(s, { type: "spray", plotId: 0, pest: "rice_blast", mode: "preventive", payWith: "cash" });
    s = act(s, { type: "adjustWater", plotId: 0 });
    expect(s.cash).toBe(10_000_000 - 1_750_000 - 1_500_000 - 250_000);
    expect(s.energy).toBe(95 - 15 - 20 - 10);
    expect(s.plots[0]?.crop?.fertilizerApps[0]?.correct).toBe(true);
    expect(s.plots[0]?.crop?.preventiveUntil.rice_blast).toBe(6);
    expect(s.plots[0]?.known?.waterLevel).toBe("ok");
    expect(refused(s, { type: "spray", plotId: 1, pest: "rice_blast", mode: "cure", payWith: "cash" })).toMatch(/không có lúa/);
    expect(refused(s, { type: "spray", plotId: 0, pest: "locust", mode: "cure", payWith: "cash" })).toMatch(/sâu bệnh/);
  });
});

describe("harvest → sale → settlement (spec §7, §11)", () => {
  /** A DX-1 crop sown with cash on day 2, harvestable on day 101, and the state on day 101 in the field. */
  function readyToHarvest(): GameState {
    let s = act({ ...createInitialState(8, data), cash: 10_000_000 }, field);
    s = act(s, sow(0));
    const plots = s.plots.map((p) =>
      p.id === 0 && p.crop ? { ...p, status: "harvestable" as const, crop: { ...p.crop, growth: 90, harvestableDay: 101 } } : p,
    );
    return { ...s, plots, day: 101 };
  }

  it("harvest creates a lot; selling it finishes the season and shows the settlement, then play resumes", () => {
    let s = act(readyToHarvest(), { type: "harvest", plotId: 0, method: "machine" });
    expect(s.harvestLots).toHaveLength(1);
    expect(s.phase.kind).toBe("halfDay");
    const lotId = s.harvestLots[0]?.id ?? "";
    s = act(s, { type: "sellLot", lotId });
    expect(s.phase).toEqual({ kind: "settlement", seasonKey: "DX-1", resume: { kind: "halfDay", slot: "morning", activity: "field" } });
    expect(refused(s, rest)).toMatch(/tính sổ/);

    const settlement = computeSettlement(s, "DX-1");
    expect(settlement.plots).toHaveLength(1);
    expect(settlement.supplies).toBe(1_875_000);
    expect(settlement.farmWork).toBe(2_000_000 + 1_500_000);
    expect(settlement.revenue).toBe(settlement.plots[0]?.riceSales);
    expect(settlement.livingCost).toBe(0); // ledger rows in this test are all on day 0 and 101
    expect(settlement.profit).toBe(settlement.revenue - 1_875_000 - 3_500_000);

    s = act(s, { type: "acknowledge" });
    expect(s.phase).toEqual({ kind: "halfDay", slot: "morning", activity: "field" });
    expect(s.settledSeasons).toEqual(["DX-1"]);
    expect(summarize(s, data).seasonsCompleted).toBe(1);
  });

  it("quit sells every lot and ends the run", () => {
    let s = act(readyToHarvest(), { type: "harvest", plotId: 0, method: "hand" });
    const cashBefore = s.cash;
    s = act(s, { type: "quit" });
    expect(s.phase).toEqual({ kind: "gameOver", reason: "quit" });
    expect(s.harvestLots).toEqual([]);
    expect(s.cash).toBeGreaterThan(cashBefore);
  });
});

describe("finance actions go through applyAction", () => {
  it("loan shark, repay, roll over, rent extension", () => {
    let s = createInitialState(9, data);
    s = act(s, { type: "takeLoanShark", amount: 1_000_000 });
    const id = s.loans.find((l) => l.kind === "loan_shark")?.id ?? "";
    s = act(s, { type: "rollOverLoan", loanId: id });
    s = act(s, { type: "repay", loanId: id, amount: 1_100_000 });
    s = act(s, { type: "requestRentExtension" });
    expect(s.cash).toBe(3_000_000 + 1_000_000 - 100_000 - 1_100_000);
    expect(refused(s, { type: "requestRentExtension" })).toMatch(/đã xin/);
    expect(refused(s, { type: "takeLoanShark", amount: 20_000_000 })).toMatch(/hạn mức/);
  });

  it("advance sale needs a growing plot", () => {
    const s = stateWithCrops({ 1: crop({ sowDay: 0 }) });
    expect(act(s, { type: "sellAdvance", plotId: 1, ratio: 0.5 }).advanceContracts).toHaveLength(1);
    expect(refused(s, { type: "sellAdvance", plotId: 2, ratio: 0.5 })).toMatch(/đang trồng/);
  });
});

describe("skip (spec §3, decisions A13, B15)", () => {
  const skip = (maxDays: number, stopOn = ALL_STOP_CONDITIONS, defaultActivity: "rest" | "hired_work" = "rest"): Action => ({
    type: "skipUntil",
    defaultActivity,
    stopOn: [...stopOn],
    maxDays,
  });
  const lastSkip = (s: GameState) => s.log.filter((e) => e.kind === "skipStopped").at(-1);

  it("runs maxDays of the default activity and logs why it stopped", () => {
    const s = act({ ...createInitialState(10, data), day: 20 }, skip(5, []));
    expect(s.day).toBe(25);
    expect(lastSkip(s)).toMatchObject({ reason: "maxDays", days: 5 });
  });

  it("always stops on Tết and on the rent due day", () => {
    const tet = act({ ...createInitialState(11, data), day: 70 }, skip(30, []));
    expect(tet.day).toBe(80);
    expect(lastSkip(tet)).toMatchObject({ reason: "tet" });
    const rent = act({ ...createInitialState(11, data), day: 140 }, skip(30, []));
    expect(rent.day).toBe(150);
    expect(lastSkip(rent)).toMatchObject({ reason: "rentDue" });
  });

  it("always stops on the morning the public schedule says a crop can be harvested", () => {
    const s0 = { ...stateWithCrops({ 0: crop({ sowDay: 2, growth: 60 }) }), day: 90 };
    const expected = expectedSchedule(2, "variety_a", data).harvestable;
    const s = act(s0, skip(30, []));
    expect(s.day).toBeLessThanOrEqual(expected);
    expect(["harvestable", "storm"]).toContain(lastSkip(s)?.reason);
  });

  it("chosen conditions only fire on something new", () => {
    const base = { ...createInitialState(12, data), day: 30 };
    const withForecast = (predicted: "sunny" | "storm"): GameState => ({
      ...base,
      weather: { ...base.weather, realized: "cloudy", forecast: [0, 1, 2].map((k) => ({ day: 30 + k, predicted, accuracy: 0.8 })) as GameState["weather"]["forecast"] },
    });
    expect(stopReason(withForecast("sunny"), withForecast("storm"), ["severeForecast"], data)).toBe("severeForecast");
    expect(stopReason(withForecast("storm"), withForecast("storm"), ["severeForecast"], data)).toBeNull();
    expect(stopReason(withForecast("sunny"), withForecast("storm"), [], data)).toBeNull();
    const alert = { ...withForecast("sunny"), regionalAlerts: [{ pestId: "rice_blast", startDay: 30, endDay: 43 }] };
    expect(stopReason(withForecast("sunny"), alert, ["pestAlert"], data)).toBe("pestAlert");
  });

  it("hired work falls back to rest when there is none", () => {
    const s = act({ ...createInitialState(13, data), day: 20 }, skip(10, [], "hired_work"));
    const wages = s.ledger.filter((e) => e.category === "hired_work").length;
    expect(wages).toBeGreaterThan(0);
    expect(wages).toBeLessThan(20);
  });
});

describe("determinism (same seed + same actions ⇒ same state)", () => {
  function play(seed: number): GameState {
    let s = createInitialState(seed, data);
    s = act(s, field);
    s = act(s, sow(0, "store_credit"));
    s = act(s, { type: "endHalfDay" });
    s = act(s, rest);
    for (let i = 0; i < 1000 && s.phase.kind !== "gameOver"; i++) {
      if (s.phase.kind === "settlement") s = act(s, { type: "acknowledge" });
      else s = act(s, { type: "skipUntil", defaultActivity: "hired_work", stopOn: [...ALL_STOP_CONDITIONS], maxDays: 30 });
    }
    return s;
  }

  it("two plays of a year match exactly and survive a JSON round trip", () => {
    const a = play(2024);
    const b = play(2024);
    expect(b).toEqual(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    expect(a.phase.kind).toBe("gameOver");
    expect(Number.isFinite(netWorth(a, data))).toBe(true);
  });

  it("different seeds diverge", () => {
    expect(play(1).rngState).not.toBe(play(2).rngState);
  });
});
