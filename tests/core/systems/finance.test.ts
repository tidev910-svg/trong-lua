import { describe, expect, it } from "vitest";
import { Rng } from "../../../core/rng";
import {
  advanceSaleRefusal,
  allDebt,
  checkLoans,
  doHiredWork,
  expectedYieldKg,
  hiredWorkRefusal,
  loanSharkRefusal,
  payCost,
  payMandatoryCosts,
  rentExtensionRefusal,
  repayLoan,
  repayRefusal,
  repayStoreCreditFromSale,
  requestRentExtension,
  rollHiredWork,
  rollOverLoan,
  rollOverRefusal,
  sellAdvance,
  settleNegativeCash,
  storeCreditRefusal,
  takeLoanShark,
  totalDebt,
} from "../../../core/systems/finance";
import { varietyMarketPrice } from "../../../core/systems/market";
import type { GameState, Loan } from "../../../core/types";
import { crop, data, stateWithCrops } from "../../helpers";

const start = (): GameState => stateWithCrops({});
const loan = (s: GameState, kind: Loan["kind"]) => s.loans.find((l) => l.kind === kind);
const shark = (s: GameState) => s.loans.filter((l) => l.kind === "loan_shark");

describe("mandatory costs and arrears (spec §8, decision A1)", () => {
  it("living cost every night; Tết cost on tetDay", () => {
    const s = payMandatoryCosts({ ...start(), day: 10 }, data);
    expect(s.cash).toBe(3_000_000 - 40_000);
    const tet = payMandatoryCosts({ ...start(), day: data.calendar.tetDay }, data);
    expect(tet.cash).toBe(3_000_000 - 40_000 - 3_500_000);
    expect(tet.log.at(-1)).toEqual({ day: 80, kind: "tet", amount: 3_500_000 });
  });

  it("negative cash becomes one household-arrears loan, due today", () => {
    let s = settleNegativeCash({ ...start(), day: 80, cash: -540_000 });
    expect(s.cash).toBe(0);
    expect(loan(s, "household_arrears")).toMatchObject({ balance: 540_000, dueDay: 80, lateSinceDay: null });
    s = settleNegativeCash({ ...s, cash: -40_000 });
    expect(s.loans.filter((l) => l.kind === "household_arrears")).toHaveLength(1);
    expect(loan(s, "household_arrears")?.balance).toBe(580_000);
    expect(settleNegativeCash(start())).toEqual(start());
  });
});

describe("total debt (PROTOTYPE_SPEC §14)", () => {
  it("family loan and rent count only once due; everything counts in net worth", () => {
    const s = start();
    expect(totalDebt(s)).toBe(0);
    expect(allDebt(s)).toBe(10_000_000);
    expect(totalDebt({ ...s, day: 150 })).toBe(5_000_000);
    expect(totalDebt(takeLoanShark(s, 2_000_000, data))).toBe(2_200_000);
  });
});

describe("store credit (decision A8)", () => {
  it("cash purchases just cost cash", () => {
    const s = payCost(start(), 350_000, "cash", { category: "fertilizer", plotId: 1, seasonKey: "DX-1" }, data);
    expect(s.cash).toBe(2_650_000);
    expect(s.ledger.at(-1)).toEqual({ day: 0, amount: -350_000, category: "fertilizer", plotId: 1, seasonKey: "DX-1" });
  });

  it("on credit: price × (1 + markup) added to one open loan due on the last day, logged as a cashless cost", () => {
    let s = payCost(start(), 350_000, "store_credit", { category: "fertilizer" }, data);
    s = payCost(s, 300_000, "store_credit", { category: "spray" }, data);
    expect(s.cash).toBe(3_000_000);
    expect(s.loans.filter((l) => l.kind === "store_credit")).toHaveLength(1);
    expect(loan(s, "store_credit")).toMatchObject({ balance: 402_500 + 345_000, dueDay: 364 });
    expect(s.ledger.at(-1)).toEqual({ day: 0, amount: -345_000, cashless: true, category: "spray" });
  });

  it("refused below minUyTin or over the limit", () => {
    expect(storeCreditRefusal(start(), 100_000, data)).toBeNull();
    expect(storeCreditRefusal({ ...start(), uyTin: 29 }, 100_000, data)).toMatch(/uy tín/);
    const { limit, markup } = data.finance.storeCredit;
    const nearLimit = payCost(start(), Math.floor((limit - 50_000) / (1 + markup)), "store_credit", { category: "seed" }, data);
    expect(storeCreditRefusal(nearLimit, 30_000, data)).toBeNull();
    expect(storeCreditRefusal(nearLimit, 60_000, data)).toMatch(/hạn mức/);
  });

  it("each rice sale pays the whole balance from cash; +uy tín when paid off on time", () => {
    const s = payCost(start(), 1_000_000, "store_credit", { category: "seed" }, data);
    const paid = repayStoreCreditFromSale(s, data);
    expect(paid.cash).toBe(3_000_000 - 1_150_000);
    expect(loan(paid, "store_credit")).toBeUndefined();
    expect(paid.uyTin).toBe(50 + data.finance.uyTin.onTimePayment);
  });

  it("what cash cannot cover becomes due today", () => {
    const s = { ...payCost(start(), 4_000_000, "store_credit", { category: "seed" }, data), day: 120 };
    const paid = repayStoreCreditFromSale(s, data);
    expect(paid.cash).toBe(0);
    expect(loan(paid, "store_credit")).toMatchObject({ balance: 4_600_000 - 3_000_000, dueDay: 120 });
  });
});

describe("loan shark (decision A7)", () => {
  it("cash now; owe amount + interest in termDays; interest logged as cashless", () => {
    const s = takeLoanShark({ ...start(), day: 20 }, 2_000_000, data);
    expect(s.cash).toBe(5_000_000);
    expect(shark(s)[0]).toMatchObject({ principal: 2_000_000, balance: 2_200_000, takenDay: 20, dueDay: 50 });
    expect(s.ledger.slice(-2)).toEqual([
      { day: 20, amount: 2_000_000, category: "loan_received", loanId: shark(s)[0]?.id },
      { day: 20, amount: -200_000, cashless: true, category: "interest", loanId: shark(s)[0]?.id },
    ]);
  });

  it("refusals: uy tín, total debt, max principal", () => {
    expect(loanSharkRefusal(start(), 2_000_000, data)).toBeNull();
    expect(loanSharkRefusal({ ...start(), uyTin: 9 }, 1, data)).toMatch(/Uy tín/);
    expect(loanSharkRefusal(start(), 10_000_001, data)).toMatch(/hạn mức/);
    const deep = { ...takeLoanShark(start(), 10_000_000, data), day: 150 }; // 11 tr shark + 5 tr rent due = 16 tr
    expect(loanSharkRefusal(deep, 1, data)).toMatch(/nợ quá nhiều/);
    expect(loanSharkRefusal(start(), 0, data)).toMatch(/không hợp lệ/);
  });

  it("early repayment still owes the full term's interest", () => {
    const s = takeLoanShark(start(), 1_000_000, data);
    const paid = repayLoan({ ...s, day: 1 }, shark(s)[0]?.id ?? "", 1_100_000, data);
    expect(shark(paid)).toEqual([]);
    expect(paid.cash).toBe(3_000_000 - 100_000);
    expect(paid.uyTin).toBe(53);
  });

  it("roll over: pay the interest, principal + a new term of interest due termDays later", () => {
    const s = takeLoanShark(start(), 1_000_000, data);
    const id = shark(s)[0]?.id ?? "";
    expect(rollOverRefusal(s, id)).toBeNull();
    const rolled = rollOverLoan({ ...s, day: 30 }, id, data);
    expect(rolled.cash).toBe(4_000_000 - 100_000);
    expect(shark(rolled)[0]).toMatchObject({ principal: 1_000_000, balance: 1_100_000, dueDay: 60 });
    expect(rolled.uyTin).toBe(50);
  });

  it("roll over with this term's interest already repaid: no zero repayment row (a -0 does not survive JSON)", () => {
    const s = takeLoanShark(start(), 1_000_000, data);
    const id = shark(s)[0]?.id ?? "";
    const paidInterest = repayLoan(s, id, 100_000, data);
    const rolled = rollOverLoan(paidInterest, id, data);
    expect(rolled.cash).toBe(paidInterest.cash);
    expect(rolled.ledger.slice(paidInterest.ledger.length).map((e) => e.category)).toEqual(["interest"]);
    expect(JSON.parse(JSON.stringify(rolled))).toEqual(rolled);
  });

  it("late: +latePenaltyRate once, uy tín penalty once, then ×(1 + interest) every 30 days", () => {
    let s = takeLoanShark(start(), 1_000_000, data); // due day 30, owe 1.100.000
    s = checkLoans({ ...s, day: 29 }, data);
    expect(shark(s)[0]?.lateSinceDay).toBeNull();
    s = checkLoans({ ...s, day: 30 }, data);
    expect(shark(s)[0]).toMatchObject({ lateSinceDay: 31, balance: 1_155_000 });
    expect(s.uyTin).toBe(40);
    expect(s.log.at(-1)).toMatchObject({ kind: "loanLate", loanKind: "loan_shark" });
    for (let day = 31; day <= 60; day++) s = checkLoans({ ...s, day }, data);
    expect(shark(s)[0]?.balance).toBe(Math.round(1_155_000 * 1.1));
    expect(s.uyTin).toBe(40);
    expect(rollOverRefusal(s, shark(s)[0]?.id ?? "")).toMatch(/quá hạn/);
  });
});

describe("due dates for other loans (decision A9)", () => {
  it("rent late: −10 uy tín once, no extra interest", () => {
    let s = checkLoans({ ...start(), day: 150 }, data);
    expect(loan(s, "rent")).toMatchObject({ lateSinceDay: 151, balance: 5_000_000 });
    expect(s.uyTin).toBe(40);
    s = checkLoans({ ...s, day: 151 }, data);
    expect(s.uyTin).toBe(40);
  });

  it("family loan late: −familyLoan.latePenaltyUyTin", () => {
    const s = checkLoans({ ...start(), day: 364 }, data);
    expect(s.uyTin).toBe(50 - 20 - 10); // family −20 and rent −10 (both unpaid by day 364)
  });

  it("paying off on time gives +onTimePayment; late payment does not", () => {
    const rentId = loan(start(), "rent")?.id ?? "";
    const onTime = repayLoan({ ...start(), day: 150, cash: 6_000_000 }, rentId, 5_000_000, data);
    expect(onTime.uyTin).toBe(53);
    const late = checkLoans({ ...start(), day: 150, cash: 6_000_000 }, data);
    expect(repayLoan(late, rentId, 5_000_000, data).uyTin).toBe(40);
  });

  it("partial repayment keeps the loan; refusals", () => {
    const rentId = loan(start(), "rent")?.id ?? "";
    const s = repayLoan(start(), rentId, 1_000_000, data);
    expect(loan(s, "rent")?.balance).toBe(4_000_000);
    expect(s.uyTin).toBe(50);
    expect(repayRefusal(start(), rentId, 3_000_001)).toMatch(/tiền mặt/);
    expect(repayRefusal({ ...start(), cash: 9_000_000 }, rentId, 5_000_001)).toMatch(/nhiều hơn/);
    expect(repayRefusal(start(), "nope", 1)).toMatch(/Không có/);
  });
});

describe("advance sale (spec §8, decision B12)", () => {
  const growing = () => ({ ...stateWithCrops({ 1: crop({ sowDay: 5, method: "transplant" }) }), day: 40 });

  it("expected kg = baseYield × yieldFactor × expectedYieldFactor", () => {
    expect(expectedYieldKg("variety_a", "transplant", 5, data)).toBeCloseTo(4000 * 1.05 * 0.9, 9);
    expect(expectedYieldKg("variety_b", "broadcast", 100, data)).toBeCloseTo(3200 * 1.0 * 0.9, 9);
  });

  it("cash = expected kg × ratio × variety market price × priceFactor; the kg are owed at harvest", () => {
    const s0 = growing();
    const s = sellAdvance(s0, 1, 0.5, data);
    const kg = 4000 * 1.05 * 0.9 * 0.5;
    const price = varietyMarketPrice(s0, "variety_a", data) * 0.7;
    expect(s.cash).toBe(3_000_000 + Math.round(kg * price));
    expect(s.advanceContracts).toHaveLength(1);
    expect(s.advanceContracts[0]?.kg).toBeCloseTo(kg, 9);
    expect(s.ledger.at(-1)).toMatchObject({ category: "advance_sale", plotId: 1, seasonKey: "DX-1" });
  });

  it("one contract per growing plot, ratio up to maxRatioOfExpected", () => {
    const s = growing();
    expect(advanceSaleRefusal(s, 1, 0.6, data)).toBeNull();
    expect(advanceSaleRefusal(s, 1, 0.61, data)).toMatch(/Tỉ lệ/);
    expect(advanceSaleRefusal(s, 0, 0.5, data)).toMatch(/đang trồng/);
    expect(advanceSaleRefusal(sellAdvance(s, 1, 0.3, data), 1, 0.3, data)).toMatch(/đã bán non/);
  });

  it("allowed until harvest: a ripe crop still in the field can be sold in advance (PROTOTYPE_SPEC §14)", () => {
    const s = growing();
    const ripe: GameState = { ...s, plots: s.plots.map((p) => (p.id === 1 ? { ...p, status: "harvestable" } : p)) };
    expect(advanceSaleRefusal(ripe, 1, 0.5, data)).toBeNull();
    const harvested: GameState = { ...s, plots: s.plots.map((p) => (p.id === 1 ? { ...p, status: "harvested", crop: null } : p)) };
    expect(advanceSaleRefusal(harvested, 1, 0.5, data)).toMatch(/đang trồng/);
  });
});

describe("rent extension", () => {
  it("moves the next rent due date, costs uy tín, once per year", () => {
    const s = requestRentExtension(start(), data);
    expect(loan(s, "rent")?.dueDay).toBe(180);
    expect(s.uyTin).toBe(35);
    expect(rentExtensionRefusal(s, data)).toMatch(/đã xin/);
  });

  it("not once the installment is late", () => {
    expect(rentExtensionRefusal(checkLoans({ ...start(), day: 150 }, data), data)).toMatch(/quá hạn/);
  });
});

describe("hired work", () => {
  it("wage, energy, and uy tín capped per season", () => {
    let s: GameState = { ...start(), day: 10, hiredWorkAvailable: true };
    s = doHiredWork(s, data);
    expect([s.cash, s.energy, s.uyTin]).toEqual([3_150_000, 65, 50.5]);
    for (let i = 0; i < 30; i++) s = doHiredWork({ ...s, energy: 100 }, data);
    expect(s.uyTin).toBe(58); // +8 cap in DX-1
    s = doHiredWork({ ...s, day: 100, energy: 100 }, data); // HT-1: new season
    expect(s.uyTin).toBe(58.5);
  });

  it("needs work to exist and enough energy", () => {
    expect(hiredWorkRefusal({ ...start(), hiredWorkAvailable: false }, data)).toMatch(/không có ai/);
    expect(hiredWorkRefusal({ ...start(), hiredWorkAvailable: true, energy: 34 }, data)).toMatch(/sức lực/);
  });

  it("tomorrow's work follows availabilityByMonth", () => {
    let hits = 0;
    const N = 20_000;
    const rng = Rng.fromSeed(1);
    for (let i = 0; i < N; i++) if (rollHiredWork({ ...start(), day: 100 }, data, rng).hiredWorkAvailable) hits++; // tomorrow = March
    expect(hits / N).toBeCloseTo(data.economy.hiredWork.availabilityByMonth["3"], 2);
  });
});

describe("uy tín stays within bounds", () => {
  it("never below 0", () => {
    let s = { ...start(), uyTin: 5 };
    s = checkLoans({ ...s, day: 150 }, data);
    expect(s.uyTin).toBe(0);
  });
});
