import { describe, expect, it } from "vitest";
import { lateDays, loanStage, noCashSourceLeft, reRent, reRentCost, reRentRefusal, totalAssets, updateDebtSpiral } from "../../../core/systems/debt";
import { checkLoans, takeLoanShark } from "../../../core/systems/finance";
import { lotValue } from "../../../core/systems/harvest";
import type { GameState, HarvestLot } from "../../../core/types";
import { crop, data, stateWithCrops } from "../../helpers";

const start = (): GameState => stateWithCrops({});
/** Runs the night steps that matter here (due checks + spiral) from `from` to `to` inclusive. */
function nights(s: GameState, from: number, to: number): GameState {
  let next = s;
  for (let day = from; day <= to; day++) {
    next = updateDebtSpiral(checkLoans({ ...next, day }, data), data);
    if (next.phase.kind === "gameOver") break;
  }
  return { ...next, day: to };
}
const rent = (s: GameState) => s.loans.find((l) => l.kind === "rent");
const lot = (id: string, kg: number): HarvestLot => ({ id, plotId: 4, varietyId: "variety_a", seasonKey: "DX-1", kg, harvestDay: 140, nightsWaited: 0 });

describe("stages of one loan", () => {
  it("0 on time → 1 late → 2 after lateDaysToWarning → 3 after the final deadline", () => {
    let s = takeLoanShark(start(), 1_000_000, data); // due day 30
    s = nights(s, 0, 30);
    const id = s.loans.find((l) => l.kind === "loan_shark")?.id ?? "";
    const loanOf = (x: GameState) => x.loans.find((l) => l.id === id);
    expect(lateDays(loanOf(s)!, 30)).toBe(1);
    expect(s.debtStage).toBe(1);
    s = nights(s, 31, 36); // morning of day 37 = 7 days late
    expect(s.debtStage).toBe(1);
    s = nights(s, 37, 37); // morning of 38 = 8 days late → stage 2
    expect(s.debtStage).toBe(2);
    expect(loanOf(s)).toMatchObject({ warningDay: 38, finalDeadlineDay: 52 });
    expect(s.log.at(-1)).toEqual({ day: 38, kind: "creditorVisit", loanId: id, loanKind: "loan_shark", finalDeadlineDay: 52 });
    expect(s.stats.nearBankruptcyCount).toBe(1);
    expect(loanStage(loanOf(s)!, 51)).toBe(2);
    expect(loanStage(loanOf(s)!, 52)).toBe(3);
  });

  it("paying the loan brings the stage back to 0; max stage stays in stats", () => {
    let s = nights(takeLoanShark(start(), 1_000_000, data), 0, 40);
    expect(s.debtStage).toBe(2);
    const id = s.loans.find((l) => l.kind === "loan_shark")?.id ?? "";
    s = { ...s, loans: s.loans.filter((l) => l.id !== id) };
    s = nights(s, 41, 41);
    expect(s.debtStage).toBe(0);
    expect(s.stats.maxDebtStage).toBe(2);
  });
});

describe("stage 3: foreclosure (decision A10)", () => {
  it("sells lots at forcedPriceFactor, forces advance sales, pays late loans", () => {
    let s = takeLoanShark({ ...stateWithCrops({ 1: crop({ sowDay: 30, growth: 20 }) }), cash: 0 }, 1_000_000, data);
    s = { ...s, cash: 0, harvestLots: [lot("lot-x", 600)] };
    s = nights(s, 0, 51);
    expect(s.debtStage).toBe(2);
    const expectedLot = lotValue({ ...s, day: 52 }, lot("lot-x", 600), data, data.finance.advanceSale.forcedPriceFactor);
    s = nights(s, 52, 52);
    const event = s.log.find((e) => e.kind === "foreclosure");
    expect(event).toMatchObject({ lotsSold: 1, plotsSoldAdvance: 1 });
    expect(s.harvestLots).toEqual([]);
    expect(s.advanceContracts).toHaveLength(1);
    expect(expectedLot).toBeGreaterThan(0);
    expect(s.loans.some((l) => l.kind === "loan_shark")).toBe(false); // paid off from the forced sales
  });
});

describe("stage 4: losing the land", () => {
  it("unpaid rent past its final deadline: land lost, crops lost, stage 4", () => {
    let s = { ...stateWithCrops({ 0: crop({ sowDay: 140, growth: 20 }) }), cash: 0 };
    s = nights(s, 140, 171);
    expect(s.landAccess).toBe(true);
    expect(rent(s)?.finalDeadlineDay).toBe(172);
    s = nights(s, 172, 172);
    expect(s.landAccess).toBe(false);
    expect(s.debtStage).toBe(4);
    expect(s.plots.every((p) => p.status === "empty" && p.crop === null)).toBe(true);
    expect(s.log.some((e) => e.kind === "landLost")).toBe(true);
  });

  it("advance contracts on lost crops are paid back as a shortfall", () => {
    let s = { ...stateWithCrops({ 0: crop({ sowDay: 140, growth: 20 }) }), cash: 0 };
    s = { ...s, advanceContracts: [{ id: "adv-1", plotId: 0, day: 145, kg: 100, pricePerKg: 5000 }] };
    s = nights(s, 140, 172);
    expect(s.advanceContracts).toEqual([]);
    expect(s.loans.some((l) => l.kind === "household_arrears")).toBe(true);
  });

  it("re-renting costs the unpaid rent + surcharge and restores farming", () => {
    let s = nights({ ...start(), cash: 0 }, 140, 172);
    expect(reRentRefusal(s, data)).toMatch(/Chưa đủ/);
    expect(reRentCost(s, data)).toBe(6_000_000);
    s = { ...s, cash: 7_000_000 };
    expect(reRentRefusal(s, data)).toBeNull();
    s = reRent(s, data);
    expect([s.cash, s.landAccess, rent(s)]).toEqual([1_000_000, true, undefined]);
    s = nights(s, 173, 173);
    expect(s.debtStage).toBe(0);
    expect(reRentRefusal(s, data)).toMatch(/Đang còn thuê/);
  });
});

describe("stage 5: bankruptcy (decision A11)", () => {
  it("debt above assets AND no cash source left ends the game", () => {
    let s = { ...start(), day: 200, cash: 0, uyTin: 5 }; // loan shark refuses below minUyTin; no growing plots
    s = { ...s, loans: s.loans.map((l) => (l.kind === "rent" ? { ...l, dueDay: 150 } : l)) };
    s = updateDebtSpiral(s, data);
    expect(s.debtStage).toBe(5);
    expect(s.phase).toEqual({ kind: "gameOver", reason: "bankrupt" });
    expect(s.log.at(-1)).toEqual({ day: 200, kind: "bankrupt" });
  });

  it("not bankrupt while the loan shark still lends, or a plot can be sold in advance", () => {
    const deep = { ...start(), day: 200, cash: 0 };
    expect(noCashSourceLeft(deep, data)).toBe(false);
    const noShark = { ...stateWithCrops({ 2: crop({ sowDay: 190 }) }), day: 200, cash: 0, uyTin: 5 };
    expect(noCashSourceLeft(noShark, data)).toBe(false);
    expect(updateDebtSpiral(noShark, data).phase.kind).not.toBe("gameOver");
  });

  it("assets = cash + lots at trader price", () => {
    const s = { ...start(), harvestLots: [lot("a", 500)] };
    expect(totalAssets(s, data)).toBe(3_000_000 + lotValue(s, lot("a", 500), data));
  });
});

describe("stats", () => {
  it("tracks the largest single debt", () => {
    const s = updateDebtSpiral(takeLoanShark(start(), 8_000_000, data), data);
    expect(s.stats.largestDebt).toBe(8_800_000);
  });
});
