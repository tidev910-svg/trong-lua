import { describe, expect, it } from "vitest";
import { Rng } from "../../../core/rng";
import { seasonKeyOfDay } from "../../../core/systems/calendar";
import { ageLots, harvestPlot, lotValue, sellLot } from "../../../core/systems/harvest";
import { isHarvestGlut, marketPrice, traderPricePerKg, updateMarket, varietyMarketPrice } from "../../../core/systems/market";
import type { GameState, HarvestLot } from "../../../core/types";
import { crop, data, stateWithCrops } from "../../helpers";

const at = (day: number, deviation = 0, uyTin = 50): GameState => ({
  ...stateWithCrops({}),
  day,
  uyTin,
  market: { deviation },
});

describe("season keys (for settlement, decision A14)", () => {
  it.each([
    [0, "DX-1"],
    [77, "DX-1"],
    [78, "HT-1"],
    [197, "HT-1"],
    [198, "TD-1"],
    [350, "TD-1"],
    [351, "DX-2"],
    [364, "DX-2"],
  ])("day %i → %s", (day, key) => {
    expect(seasonKeyOfDay(day, data.calendar)).toBe(key);
  });

  it("a new crop carries the key of its sowing day", () => {
    expect(crop({ sowDay: 100 }).seasonKey).toBe("HT-1");
    expect(crop({ sowDay: 360 }).seasonKey).toBe("DX-2");
  });
});

describe("market price (spec §7)", () => {
  it("= basePriceByMonth × (1 + deviation) × glut multiplier", () => {
    expect(marketPrice(at(47), data)).toBe(7400); // January, no glut
    expect(marketPrice(at(47, 0.05), data)).toBeCloseTo(7400 * 1.05, 9);
    expect(marketPrice(at(120), data)).toBeCloseTo(7800 * 0.9, 9); // March, inside glut window 110–145
  });

  it("glut windows are inclusive", () => {
    expect([109, 110, 145, 146].map((d) => isHarvestGlut(d, data))).toEqual([false, true, true, false]);
    expect([234, 235, 275, 276, 340, 364].map((d) => isHarvestGlut(d, data))).toEqual([false, true, true, false, true, true]);
  });

  it("variety price multiplier and trader share by uy tín", () => {
    expect(varietyMarketPrice(at(47), "variety_b", data)).toBeCloseTo(7400 * 1.15, 9);
    expect(traderPricePerKg(at(47, 0, 50), "variety_a", data)).toBeCloseTo(7400 * 0.92 * (0.92 + 0.08 * 0.5), 9);
    expect(traderPricePerKg(at(47, 0, 100), "variety_a", data)).toBeCloseTo(7400 * 0.92 * 1.0, 9);
    expect(traderPricePerKg(at(47, 0, 0), "variety_a", data)).toBeCloseTo(7400 * 0.92 * 0.92, 9);
  });

  it("daily deviation moves by at most ±dailyVolatility and stays within ±maxDeviation", () => {
    const rng = Rng.fromSeed(1);
    let s = at(0);
    let sum = 0;
    for (let i = 0; i < 20_000; i++) {
      const next = updateMarket(s, data, rng);
      expect(Math.abs(next.market.deviation - s.market.deviation)).toBeLessThanOrEqual(data.market.dailyVolatility + 1e-12);
      expect(Math.abs(next.market.deviation)).toBeLessThanOrEqual(data.market.maxDeviation);
      sum += next.market.deviation - s.market.deviation;
      s = next;
    }
    const clamped = updateMarket(at(0, data.market.maxDeviation), { ...data, market: { ...data.market, dailyVolatility: 1 } }, Rng.fromSeed(5));
    expect(Math.abs(clamped.market.deviation)).toBeLessThanOrEqual(data.market.maxDeviation);
    expect(Math.abs(sum / 20_000)).toBeLessThan(0.001);
  });
});

describe("harvest (spec §7)", () => {
  const ripe = (overrides = {}) => crop({ growth: 90, harvestableDay: 100, health: 1, ...overrides });
  const harvestable = (s: GameState) => ({ ...s, plots: s.plots.map((p) => (p.crop ? { ...p, status: "harvestable" as const } : p)) });
  const base = (overrides = {}) => ({ ...harvestable(stateWithCrops({ 0: ripe(overrides) })), day: 100 });

  it("machine: pays machineCostPerPlot, plot becomes harvested, a lot is created", () => {
    const s = harvestPlot(base(), 0, "machine", data);
    expect(s.cash).toBe(3_000_000 - data.crop.harvest.machineCostPerPlot);
    expect(s.energy).toBe(100);
    expect(s.plots[0]).toMatchObject({ status: "harvested", crop: null });
    expect(s.harvestLots).toEqual([
      { id: "lot-3", plotId: 0, varietyId: "variety_a", seasonKey: "DX-1", kg: 800 * 0.7, harvestDay: 100, nightsWaited: 0 },
    ]);
    expect(s.ledger.at(-1)).toEqual({ day: 100, amount: -300_000, category: "harvest_machine", plotId: 0, seasonKey: "DX-1" });
  });

  it("hand: costs energy, no money", () => {
    const s = harvestPlot(base(), 0, "hand", data);
    expect(s.cash).toBe(3_000_000);
    expect(s.energy).toBe(100 - data.crop.harvest.handEnergyPerPlot);
  });

  it("an advance contract takes its kg first", () => {
    const s0 = { ...base(), advanceContracts: [{ id: "adv-9", plotId: 0, day: 50, kg: 200, pricePerKg: 5000 }] };
    const s = harvestPlot(s0, 0, "machine", data);
    expect(s.harvestLots[0]?.kg).toBeCloseTo(560 - 200, 9);
    expect(s.advanceContracts).toEqual([]);
  });

  it("missing kg are paid at variety market price × shortfallPenalty", () => {
    const s0 = { ...base({ health: 0.2 }), advanceContracts: [{ id: "adv-9", plotId: 0, day: 50, kg: 300, pricePerKg: 5000 }] };
    const s = harvestPlot(s0, 0, "hand", data); // 800 × 0.2 × 0.7 = 112 kg < 300
    const shortfall = 300 - 112;
    const penalty = Math.round(shortfall * varietyMarketPrice(s0, "variety_a", data) * data.finance.advanceSale.shortfallPenalty);
    expect(s.cash).toBe(3_000_000 - penalty);
    expect(s.harvestLots).toEqual([]);
    expect(s.ledger.at(-1)).toMatchObject({ amount: -penalty, category: "advance_shortfall" });
  });

  it("refuses plots that are not harvestable", () => {
    expect(() => harvestPlot(stateWithCrops({ 0: ripe() }), 0, "machine", data)).toThrow(/not harvestable/);
  });
});

describe("selling and waiting", () => {
  const lot: HarvestLot = { id: "lot-1", plotId: 2, varietyId: "variety_b", seasonKey: "DX-1", kg: 700, harvestDay: 100, nightsWaited: 0 };
  const withLot = (day = 100): GameState => ({ ...at(day), harvestLots: [lot] });

  it("sells at today's trader price, rounded to VND", () => {
    const s = sellLot(withLot(), "lot-1", data);
    const amount = Math.round(700 * traderPricePerKg(withLot(), "variety_b", data));
    expect(lotValue(withLot(), lot, data)).toBe(amount);
    expect(s.cash).toBe(3_000_000 + amount);
    expect(s.harvestLots).toEqual([]);
    expect(s.ledger.at(-1)).toEqual({ day: 100, amount, category: "rice_sale", plotId: 2, seasonKey: "DX-1" });
    expect(s.log.at(-1)).toEqual({ day: 100, kind: "lotSold", lotId: "lot-1", kg: 700, amount, auto: false });
  });

  it("each night a waiting lot loses freshRiceLossPerDay of its weight", () => {
    const { state, autoSold } = ageLots(withLot(), data);
    expect(autoSold).toEqual([]);
    expect(state.harvestLots[0]?.kg).toBeCloseTo(700 * 0.98, 9);
    expect(state.harvestLots[0]?.nightsWaited).toBe(1);
  });

  it("after maxWaitDays nights it is sold automatically", () => {
    let s = withLot();
    let sold: string[] = [];
    for (let night = 0; night < data.crop.harvest.maxWaitDays; night++) ({ state: s, autoSold: sold } = ageLots(s, data));
    expect(sold).toEqual(["lot-1"]);
    expect(s.harvestLots).toEqual([]);
    const kg = 700 * 0.98 ** 3;
    expect(s.log.at(-1)).toMatchObject({ kind: "lotSold", auto: true });
    expect(s.cash).toBe(3_000_000 + Math.round(kg * traderPricePerKg(s, "variety_b", data)));
  });
});
