import type { GameData } from "../../data/schemas";
import type { Rng } from "../rng";
import type { GameState, LedgerCategory, LedgerEntry, Loan, LoanKind, PayWith } from "../types";
import { isTetDay, lastDay, monthKeyOfDay, seasonKeyOfDay, seasonOfSowingDay } from "./calendar";
import { findVariety } from "./growth";
import { varietyMarketPrice } from "./market";

/** Loans that count toward "tổng nợ" from the moment they exist (PROTOTYPE_SPEC §14). */
const ALWAYS_COUNTED: readonly LoanKind[] = ["loan_shark", "store_credit", "household_arrears"];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function clampUyTin(value: number, data: GameData): number {
  return Math.min(data.finance.uyTin.max, Math.max(data.finance.uyTin.min, value));
}

/** "Tổng nợ" for loan-shark refusal and bankruptcy: shark, store credit, arrears, plus anything already due. */
export function totalDebt(state: GameState): number {
  return state.loans
    .filter((l) => ALWAYS_COUNTED.includes(l.kind) || state.day >= l.dueDay)
    .reduce((sum, l) => sum + l.balance, 0);
}

/** Every loan balance, due or not (net worth, decision A12). */
export function allDebt(state: GameState): number {
  return state.loans.reduce((sum, l) => sum + l.balance, 0);
}

export function loanSharkPrincipal(state: GameState): number {
  return state.loans.filter((l) => l.kind === "loan_shark").reduce((sum, l) => sum + l.principal, 0);
}

export function storeCreditBalance(state: GameState): number {
  return state.loans.filter((l) => l.kind === "store_credit").reduce((sum, l) => sum + l.balance, 0);
}

export function isLate(loan: Loan): boolean {
  return loan.lateSinceDay !== null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newLoan(state: GameState, kind: LoanKind, amount: number, dueDay: number, principal = amount): { state: GameState; loan: Loan } {
  const loan: Loan = {
    id: `${kind}-${state.nextId}`,
    kind,
    principal,
    balance: amount,
    takenDay: state.day,
    dueDay,
    lateSinceDay: null,
    warningDay: null,
    finalDeadlineDay: null,
  };
  return { state: { ...state, nextId: state.nextId + 1, loans: [...state.loans, loan] }, loan };
}

function updateLoan(state: GameState, loanId: string, fn: (loan: Loan) => Loan): GameState {
  return { ...state, loans: state.loans.map((l) => (l.id === loanId ? fn(l) : l)) };
}

function addLedger(state: GameState, entry: Omit<LedgerEntry, "day">): GameState {
  return { ...state, ledger: [...state.ledger, { day: state.day, ...entry }] };
}

/** Removes fully paid loans; +onTimePayment uy tín for each one paid off before it was late (decision B13). */
function closePaidLoans(state: GameState, data: GameData): GameState {
  const paid = state.loans.filter((l) => l.balance <= 0);
  if (paid.length === 0) return state;
  const onTime = paid.filter((l) => !isLate(l)).length;
  return {
    ...state,
    loans: state.loans.filter((l) => l.balance > 0),
    uyTin: clampUyTin(state.uyTin + onTime * data.finance.uyTin.onTimePayment, data),
  };
}

// ---------------------------------------------------------------------------
// Paying for things: cash or store credit (decision A8)
// ---------------------------------------------------------------------------

export interface CostTag {
  category: LedgerCategory;
  plotId?: number;
  seasonKey?: string;
}

/** Price on store credit = price × (1 + markup), rounded. */
export function storeCreditPrice(amount: number, data: GameData): number {
  return Math.round(amount * (1 + data.finance.storeCredit.markup));
}

/** Why store credit is refused for this purchase, or null. */
export function storeCreditRefusal(state: GameState, amount: number, data: GameData): string | null {
  const { minUyTin, limit } = data.finance.storeCredit;
  if (state.uyTin < minUyTin) return `Đại lý chỉ bán chịu khi uy tín từ ${minUyTin}.`;
  if (storeCreditBalance(state) + storeCreditPrice(amount, data) > limit) return "Vượt hạn mức mua chịu.";
  return null;
}

/**
 * Charges a cost. Cash: cash − amount. Store credit: the marked-up price is added to the single open
 * store-credit loan (due at the next rice sale, or the last game day, decision A8) and logged as a cashless cost.
 */
export function payCost(state: GameState, amount: number, payWith: PayWith, tag: CostTag, data: GameData): GameState {
  if (payWith === "cash") return addLedger({ ...state, cash: state.cash - amount }, { amount: -amount, ...tag });
  const price = storeCreditPrice(amount, data);
  let next = state;
  const open = state.loans.find((l) => l.kind === "store_credit");
  if (open) {
    next = updateLoan(next, open.id, (l) => ({ ...l, balance: l.balance + price, principal: l.principal + price }));
  } else {
    next = newLoan(next, "store_credit", price, lastDay(data.calendar)).state;
  }
  return addLedger(next, { amount: -price, cashless: true, ...tag });
}

/**
 * After every rice sale (decision A8): the whole store-credit balance is paid from cash as far as cash allows;
 * what is left becomes due today (late from tomorrow).
 */
export function repayStoreCreditFromSale(state: GameState, data: GameData): GameState {
  let next = state;
  for (const loan of state.loans.filter((l) => l.kind === "store_credit")) {
    const pay = Math.min(loan.balance, Math.max(0, next.cash));
    if (pay > 0) next = addLedger({ ...next, cash: next.cash - pay }, { amount: -pay, category: "loan_repayment", loanId: loan.id });
    next = updateLoan(next, loan.id, (l) => ({ ...l, balance: l.balance - pay, dueDay: l.balance - pay > 0 ? Math.min(l.dueDay, next.day) : l.dueDay }));
  }
  return closePaidLoans(next, data);
}

// ---------------------------------------------------------------------------
// Loan shark (decision A7)
// ---------------------------------------------------------------------------

export function loanSharkRefusal(state: GameState, amount: number, data: GameData): string | null {
  const shark = data.finance.loanShark;
  if (!Number.isInteger(amount) || amount <= 0) return "Số tiền vay không hợp lệ.";
  if (state.uyTin < shark.minUyTin) return "Uy tín quá thấp, không ai cho vay.";
  if (totalDebt(state) > shark.refuseIfTotalDebtOver) return "Đang nợ quá nhiều, chủ nợ không cho vay thêm.";
  if (loanSharkPrincipal(state) + amount > shark.maxTotal) return "Vượt hạn mức vay nóng.";
  return null;
}

/** Interest for one term on a principal, rounded. */
export function sharkInterest(principal: number, data: GameData): number {
  return Math.round(principal * data.finance.loanShark.interestPer30Days);
}

/** New loan: cash + amount; owe amount + one term of interest (charged in full even if repaid early) in termDays. */
export function takeLoanShark(state: GameState, amount: number, data: GameData): GameState {
  const interest = sharkInterest(amount, data);
  const { state: withLoan, loan } = newLoan(state, "loan_shark", amount + interest, state.day + data.finance.loanShark.termDays, amount);
  let next = addLedger({ ...withLoan, cash: withLoan.cash + amount }, { amount, category: "loan_received", loanId: loan.id });
  next = addLedger(next, { amount: -interest, cashless: true, category: "interest", loanId: loan.id });
  return next;
}

export function rollOverRefusal(state: GameState, loanId: string): string | null {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan || loan.kind !== "loan_shark") return "Chỉ đảo được khoản vay nóng.";
  if (isLate(loan)) return "Khoản này đã quá hạn, không đảo được.";
  if (state.cash < rollOverCost(loan)) return "Không đủ tiền trả lãi để đảo nợ.";
  return null;
}

/** Interest still owed this term (balance above principal). */
export function rollOverCost(loan: Loan): number {
  return Math.max(0, loan.balance - loan.principal);
}

/** "Đảo nợ": pay this term's interest, owe the principal + a new term of interest termDays later. */
export function rollOverLoan(state: GameState, loanId: string, data: GameData): GameState {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) throw new Error(`unknown loan "${loanId}"`);
  const pay = rollOverCost(loan);
  const interest = sharkInterest(loan.principal, data);
  // Nothing to pay when this term's interest was already repaid: no ledger row (a -0 would not survive JSON).
  let next = pay > 0 ? addLedger({ ...state, cash: state.cash - pay }, { amount: -pay, category: "loan_repayment", loanId }) : state;
  next = addLedger(next, { amount: -interest, cashless: true, category: "interest", loanId });
  return updateLoan(next, loanId, (l) => ({
    ...l,
    balance: l.principal + interest,
    dueDay: l.dueDay + data.finance.loanShark.termDays,
  }));
}

// ---------------------------------------------------------------------------
// Repaying (decision B14: every obligation is a loan)
// ---------------------------------------------------------------------------

export function repayRefusal(state: GameState, loanId: string, amount: number): string | null {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) return "Không có khoản nợ này.";
  if (!Number.isInteger(amount) || amount <= 0) return "Số tiền trả không hợp lệ.";
  if (amount > loan.balance) return "Trả nhiều hơn số nợ.";
  if (amount > state.cash) return "Không đủ tiền mặt.";
  return null;
}

/** Pays part or all of a loan; a shark loan pays interest before principal. Paid-off loans close. */
export function repayLoan(state: GameState, loanId: string, amount: number, data: GameData): GameState {
  let next = addLedger({ ...state, cash: state.cash - amount }, { amount: -amount, category: "loan_repayment", loanId });
  next = updateLoan(next, loanId, (l) => {
    const balance = l.balance - amount;
    return { ...l, balance, principal: Math.min(l.principal, balance) };
  });
  return closePaidLoans(next, data);
}

// ---------------------------------------------------------------------------
// Advance sale "bán lúa non" (spec §8, decision B12)
// ---------------------------------------------------------------------------

/** Kg the trader expects from a plot: baseYield × sowing yieldFactor × expectedYieldFactor (no health). */
export function expectedYieldKg(varietyId: string, method: "broadcast" | "transplant", sowDay: number, data: GameData): number {
  const season = seasonOfSowingDay(sowDay, data.calendar);
  return findVariety(varietyId, data).baseYieldKg[season] * data.crop.sowing[method].yieldFactor * data.finance.advanceSale.expectedYieldFactor;
}

export function advanceSaleRefusal(state: GameState, plotId: number, ratio: number, data: GameData): string | null {
  const plot = state.plots.find((p) => p.id === plotId);
  // Growing or ripe but not yet harvested: the player cannot tell the two apart without visiting (PROTOTYPE_SPEC §14).
  if (!plot || (plot.status !== "growing" && plot.status !== "harvestable") || plot.crop === null) return "Chỉ bán non được lúa đang trồng.";
  if (state.advanceContracts.some((c) => c.plotId === plotId)) return "Lúa vụ này đã bán non rồi.";
  if (!(ratio > 0 && ratio <= data.finance.advanceSale.maxRatioOfExpected + 1e-9)) return "Tỉ lệ bán non không hợp lệ.";
  return null;
}

/** Advance-sale terms: kg owed = expected kg × ratio, paid at variety market price × priceFactor. */
export function advanceSaleQuote(expectedKg: number, varietyPricePerKg: number, ratio: number, priceFactor: number): { kg: number; pricePerKg: number; amount: number } {
  const kg = expectedKg * ratio;
  const pricePerKg = varietyPricePerKg * priceFactor;
  return { kg, pricePerKg, amount: Math.round(kg * pricePerKg) };
}

/** Cash now = expected kg × ratio × variety market price × priceFactor; the kg are owed at harvest. */
export function sellAdvance(state: GameState, plotId: number, ratio: number, data: GameData, priceFactor = data.finance.advanceSale.priceFactor): GameState {
  const crop = state.plots.find((p) => p.id === plotId)?.crop;
  if (!crop) throw new Error(`plot ${plotId} has no crop`);
  const { kg, pricePerKg, amount } = advanceSaleQuote(
    expectedYieldKg(crop.varietyId, crop.method, crop.sowDay, data),
    varietyMarketPrice(state, crop.varietyId, data),
    ratio,
    priceFactor,
  );
  const next = {
    ...state,
    nextId: state.nextId + 1,
    cash: state.cash + amount,
    advanceContracts: [...state.advanceContracts, { id: `adv-${state.nextId}`, plotId, day: state.day, kg, pricePerKg }],
  };
  return addLedger(next, { amount, category: "advance_sale", plotId, seasonKey: crop.seasonKey });
}

// ---------------------------------------------------------------------------
// Rent extension (spec §8)
// ---------------------------------------------------------------------------

function nextRentLoan(state: GameState): Loan | undefined {
  return state.loans.filter((l) => l.kind === "rent").sort((a, b) => a.dueDay - b.dueDay)[0];
}

export function rentExtensionRefusal(state: GameState, data: GameData): string | null {
  const rent = nextRentLoan(state);
  if (!rent) return "Không có kỳ tiền thuê nào đang chờ.";
  if (isLate(rent)) return "Kỳ tiền thuê đã quá hạn, không xin gia hạn được nữa.";
  if (state.rentExtensionsUsed >= data.finance.rentExtension.maxPerYear) return "Năm nay đã xin gia hạn rồi.";
  return null;
}

/** Postpones the next rent installment by rentExtension.days; costs uy tín. */
export function requestRentExtension(state: GameState, data: GameData): GameState {
  const rent = nextRentLoan(state);
  if (!rent) throw new Error("no rent installment");
  const { days, uyTinCost } = data.finance.rentExtension;
  return {
    ...updateLoan(state, rent.id, (l) => ({ ...l, dueDay: l.dueDay + days })),
    uyTin: clampUyTin(state.uyTin - uyTinCost, data),
    rentExtensionsUsed: state.rentExtensionsUsed + 1,
  };
}

// ---------------------------------------------------------------------------
// Hired work (spec §3)
// ---------------------------------------------------------------------------

export function hiredWorkRefusal(state: GameState, data: GameData): string | null {
  if (!state.hiredWorkAvailable) return "Hôm nay không có ai thuê.";
  if (state.energy < data.economy.hiredWork.energyCost) return "Không đủ sức lực đi làm thuê.";
  return null;
}

/** Half a day of hired work: wage, energy cost, uy tín up to the per-season cap. */
export function doHiredWork(state: GameState, data: GameData): GameState {
  const { wageHalfDay, energyCost, uyTinGain, uyTinGainCapPerSeason } = data.economy.hiredWork;
  const seasonKey = seasonKeyOfDay(state.day, data.calendar);
  const gainedSoFar = state.hiredWorkUyTin.seasonKey === seasonKey ? state.hiredWorkUyTin.gained : 0;
  const gain = Math.max(0, Math.min(uyTinGain, uyTinGainCapPerSeason - gainedSoFar));
  const next = {
    ...state,
    cash: state.cash + wageHalfDay,
    energy: state.energy - energyCost,
    uyTin: clampUyTin(state.uyTin + gain, data),
    hiredWorkUyTin: { seasonKey, gained: gainedSoFar + gain },
  };
  return addLedger(next, { amount: wageHalfDay, category: "hired_work" });
}

/** Night step 6 (part): is there hired work tomorrow? One draw, month of tomorrow. */
export function rollHiredWork(state: GameState, data: GameData, rng: Rng, day = state.day + 1): GameState {
  const chance = data.economy.hiredWork.availabilityByMonth[monthKeyOfDay(day, data.calendar)];
  return { ...state, hiredWorkAvailable: rng.chance(chance) };
}

// ---------------------------------------------------------------------------
// Night step 7: mandatory costs, arrears, interest, due dates
// ---------------------------------------------------------------------------

/** Living cost every night, Tết cost on tetDay (spec §8). */
export function payMandatoryCosts(state: GameState, data: GameData): GameState {
  let next = addLedger({ ...state, cash: state.cash - data.economy.livingCostPerDay }, { amount: -data.economy.livingCostPerDay, category: "living" });
  if (isTetDay(state.day, data.calendar)) {
    const cost = data.calendar.tetExtraCost;
    next = addLedger({ ...next, cash: next.cash - cost }, { amount: -cost, category: "tet" });
    next = { ...next, log: [...next.log, { day: state.day, kind: "tet", amount: cost }] };
  }
  return next;
}

/**
 * Decision A1: negative cash becomes household arrears, due immediately (late from tomorrow).
 * Cash goes back to 0; one open arrears loan collects all shortfalls.
 */
export function settleNegativeCash(state: GameState): GameState {
  if (state.cash >= 0) return state;
  const shortfall = -state.cash;
  const open = state.loans.find((l) => l.kind === "household_arrears");
  const base = { ...state, cash: 0 };
  if (open) return updateLoan(base, open.id, (l) => ({ ...l, balance: l.balance + shortfall, principal: l.principal + shortfall }));
  return newLoan(base, "household_arrears", shortfall, state.day).state;
}

/**
 * Due-date checks for the night of state.day (decisions A7, A9):
 * - a loan whose dueDay is today or earlier and still unpaid becomes late: uy tín penalty once
 *   (family: familyLoan.latePenaltyUyTin; others: uyTin.latePenalty), loan shark + latePenaltyRate once;
 * - late loan-shark balances grow by interestPer30Days every 30 days after dueDay.
 */
export function checkLoans(state: GameState, data: GameData): GameState {
  let next = state;
  const { loanShark, uyTin } = data.finance;
  for (const loan of state.loans) {
    if (loan.balance <= 0) continue;
    if (!isLate(loan) && state.day >= loan.dueDay) {
      const penalty = loan.kind === "family" ? -data.economy.familyLoan.latePenaltyUyTin : uyTin.latePenalty;
      next = { ...next, uyTin: clampUyTin(next.uyTin + penalty, data) };
      const extra = loan.kind === "loan_shark" ? Math.round(loan.balance * loanShark.latePenaltyRate) : 0;
      next = updateLoan(next, loan.id, (l) => ({ ...l, lateSinceDay: l.dueDay + 1, balance: l.balance + extra }));
      if (extra > 0) next = addLedger(next, { amount: -extra, cashless: true, category: "interest", loanId: loan.id });
      next = { ...next, log: [...next.log, { day: state.day, kind: "loanLate", loanId: loan.id, loanKind: loan.kind }] };
    } else if (isLate(loan) && loan.kind === "loan_shark") {
      const sinceDue = state.day - loan.dueDay;
      if (sinceDue > 0 && sinceDue % 30 === 0) {
        const interest = Math.round(loan.balance * loanShark.interestPer30Days);
        next = updateLoan(next, loan.id, (l) => ({ ...l, balance: l.balance + interest }));
        next = addLedger(next, { amount: -interest, cashless: true, category: "interest", loanId: loan.id });
      }
    }
  }
  return next;
}
