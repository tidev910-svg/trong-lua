import type { GameData } from "../../data/schemas";
import type { DebtStage, GameState, Loan } from "../types";
import { advanceSaleRefusal, isLate, loanSharkRefusal, repayLoan, sellAdvance, settleNegativeCash, totalDebt } from "./finance";
import { lotValue } from "./harvest";
import { varietyMarketPrice } from "./market";

/** Days late as of the next morning: the morning after dueDay is 1 day late. */
export function lateDays(loan: Loan, day: number): number {
  return isLate(loan) ? day + 1 - loan.dueDay : 0;
}

/** Stage of one loan (spec §10, decision A10). Rent past its final deadline is stage 4 (land lost). */
export function loanStage(loan: Loan, day: number): DebtStage {
  if (!isLate(loan)) return 0;
  if (loan.finalDeadlineDay !== null && day >= loan.finalDeadlineDay) return loan.kind === "rent" ? 4 : 3;
  if (loan.warningDay !== null) return 2;
  return 1;
}

/** Cash + unsold lots at today's trader price (decision A11). */
export function totalAssets(state: GameState, data: GameData): number {
  return state.cash + state.harvestLots.reduce((sum, lot) => sum + lotValue(state, lot, data), 0);
}

/** Decision A11: no source left that would still give cash (loan shark, or an advance sale on some plot). */
export function noCashSourceLeft(state: GameState, data: GameData): boolean {
  if (loanSharkRefusal(state, 1, data) === null) return false;
  const ratio = data.finance.advanceSale.maxRatioOfExpected;
  return !state.plots.some((p) => advanceSaleRefusal(state, p.id, ratio, data) === null);
}

function log(state: GameState, event: GameState["log"][number]): GameState {
  return { ...state, log: [...state.log, event] };
}

/** Late loans, most urgent first (earliest due date, then id). */
function lateLoans(state: GameState): Loan[] {
  return state.loans.filter(isLate).sort((a, b) => a.dueDay - b.dueDay || a.id.localeCompare(b.id));
}

/** Pays late loans from cash, most urgent first. */
function payLateLoans(state: GameState, data: GameData): GameState {
  let next = state;
  for (const loan of lateLoans(state)) {
    const current = next.loans.find((l) => l.id === loan.id);
    const pay = Math.min(current?.balance ?? 0, next.cash);
    if (pay > 0) next = repayLoan(next, loan.id, pay, data);
  }
  return next;
}

/**
 * Stage 3 "siết nợ" (decision A10): sell every lot at trader price × forcedPriceFactor, force an advance
 * sale on every growing plot without a contract (maxRatioOfExpected at forcedPriceFactor), then pay late loans.
 */
function foreclose(state: GameState, data: GameData): GameState {
  const { forcedPriceFactor, maxRatioOfExpected } = data.finance.advanceSale;
  let next = state;
  let amount = 0;
  const lots = next.harvestLots;
  for (const lot of lots) {
    const value = lotValue(next, lot, data, forcedPriceFactor);
    amount += value;
    next = {
      ...next,
      cash: next.cash + value,
      harvestLots: next.harvestLots.filter((l) => l.id !== lot.id),
      ledger: [...next.ledger, { day: next.day, amount: value, category: "rice_sale", plotId: lot.plotId, seasonKey: lot.seasonKey }],
    };
  }
  let plotsSold = 0;
  for (const plot of next.plots) {
    if (advanceSaleRefusal(next, plot.id, maxRatioOfExpected, data) !== null) continue;
    const before = next.cash;
    next = sellAdvance(next, plot.id, maxRatioOfExpected, data, forcedPriceFactor);
    amount += next.cash - before;
    plotsSold++;
  }
  next = log(next, { day: next.day, kind: "foreclosure", lotsSold: lots.length, plotsSoldAdvance: plotsSold, amount });
  return payLateLoans(next, data);
}

/**
 * Stage 4 "mất ruộng" (decision A10): no more farming; crops in the ground are lost, and advance contracts on
 * them are settled as a full shortfall (spec §7). The rent debt stays until the land is rented again.
 */
function loseLand(state: GameState, data: GameData): GameState {
  let next: GameState = { ...state, landAccess: false };
  for (const contract of state.advanceContracts) {
    const crop = state.plots.find((p) => p.id === contract.plotId)?.crop;
    if (!crop) continue;
    const penalty = Math.round(contract.kg * varietyMarketPrice(state, crop.varietyId, data) * data.finance.advanceSale.shortfallPenalty);
    next = {
      ...next,
      cash: next.cash - penalty,
      ledger: [...next.ledger, { day: next.day, amount: -penalty, category: "advance_shortfall", plotId: contract.plotId, seasonKey: crop.seasonKey }],
    };
  }
  next = {
    ...next,
    advanceContracts: [],
    plots: next.plots.map((p) => ({ ...p, status: "empty", crop: null })),
  };
  return settleNegativeCash(log(next, { day: next.day, kind: "landLost" }));
}

/** Cost to rent the land again: unpaid rent × (1 + reRentSurcharge). */
export function reRentCost(state: GameState, data: GameData): number {
  const owed = state.loans.filter((l) => l.kind === "rent" && isLate(l)).reduce((sum, l) => sum + l.balance, 0);
  return Math.round(owed * (1 + data.finance.debtSpiral.reRentSurcharge));
}

export function reRentRefusal(state: GameState, data: GameData): string | null {
  if (state.landAccess) return "Đang còn thuê ruộng.";
  if (state.cash < reRentCost(state, data)) return "Chưa đủ tiền thuê lại (tiền thuê còn nợ + phụ phí).";
  return null;
}

/** Pays the late rent plus surcharge; farming is allowed again. */
export function reRent(state: GameState, data: GameData): GameState {
  const cost = reRentCost(state, data);
  const next: GameState = {
    ...state,
    cash: state.cash - cost,
    landAccess: true,
    loans: state.loans.filter((l) => !(l.kind === "rent" && isLate(l))),
    ledger: [...state.ledger, { day: state.day, amount: -cost, category: "rent" }],
  };
  return log(next, { day: state.day, kind: "landReRented", amount: cost });
}

/**
 * Night step 8: advance each late loan through the spiral, act on stages 3–4, detect bankruptcy,
 * and record the overall stage. Deterministic, no RNG.
 */
export function updateDebtSpiral(state: GameState, data: GameData): GameState {
  const { lateDaysToWarning, finalDeadlineDays } = data.finance.debtSpiral;
  let next = state;

  // Stage 2: creditor visit and final deadline
  for (const loan of next.loans) {
    if (isLate(loan) && loan.warningDay === null && lateDays(loan, next.day) > lateDaysToWarning) {
      const warningDay = next.day + 1;
      const finalDeadlineDay = warningDay + finalDeadlineDays;
      next = { ...next, loans: next.loans.map((l) => (l.id === loan.id ? { ...l, warningDay, finalDeadlineDay } : l)) };
      next = log(next, { day: warningDay, kind: "creditorVisit", loanId: loan.id, loanKind: loan.kind, finalDeadlineDay });
    }
  }

  // Stage 4: rent past its final deadline
  if (next.landAccess && next.loans.some((l) => l.kind === "rent" && loanStage(l, next.day) === 4)) {
    next = loseLand(next, data);
  }

  // Stage 3: any other loan past its final deadline
  if (next.loans.some((l) => loanStage(l, next.day) === 3)) next = foreclose(next, data);

  // Stage 5
  const bankrupt = totalDebt(next) > totalAssets(next, data) && noCashSourceLeft(next, data);

  const loanMax = next.loans.reduce<DebtStage>((max, l) => Math.max(max, loanStage(l, next.day)) as DebtStage, 0);
  const stage: DebtStage = bankrupt ? 5 : !next.landAccess ? (Math.max(4, loanMax) as DebtStage) : loanMax;
  const enteredWarning = state.debtStage < 2 && stage >= 2;

  next = {
    ...next,
    debtStage: stage,
    stats: {
      ...next.stats,
      maxDebtStage: Math.max(next.stats.maxDebtStage, stage) as DebtStage,
      nearBankruptcyCount: next.stats.nearBankruptcyCount + (enteredWarning ? 1 : 0),
      largestDebt: Math.max(next.stats.largestDebt, ...next.loans.map((l) => l.balance)),
    },
  };
  if (bankrupt) {
    next = log({ ...next, phase: { kind: "gameOver", reason: "bankrupt" } }, { day: next.day, kind: "bankrupt" });
  }
  return next;
}
