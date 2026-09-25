import type { GameData } from "../data/schemas";
import { Rng } from "./rng";
import { seasonKeyOfDay } from "./systems/calendar";
import { rollHiredWork } from "./systems/finance";
import { planFlood } from "./systems/health";
import { initialWeather } from "./systems/weather";
import { STATE_VERSION, type GameState, type LedgerEntry, type Loan, type PlotState } from "./types";

/**
 * Day-0 state. Spec §8 / DATA_SPEC economy.json:
 * the family loan is received, and every rent installment due on day 0 is paid from it at once.
 * Later installments become rent Loans due on their day.
 * RNG draws at init, in order: weather for days 0–2, the day-0 forecast, the flood plan, day-0 hired work.
 */
export function createInitialState(seed: number, data: GameData): GameState {
  const { economy } = data;
  let nextId = 1;
  const newId = (prefix: string) => `${prefix}-${nextId++}`;

  const loans: Loan[] = [];
  const ledger: LedgerEntry[] = [];
  let cash = economy.startCash;

  const family: Loan = {
    id: newId("family"),
    kind: "family",
    principal: economy.familyLoan.amount,
    balance: economy.familyLoan.amount,
    takenDay: 0,
    dueDay: economy.familyLoan.dueDay,
    lateSinceDay: null,
    warningDay: null,
    finalDeadlineDay: null,
  };
  loans.push(family);
  cash += family.principal;
  ledger.push({ day: 0, amount: family.principal, category: "loan_received", loanId: family.id });

  for (const installment of economy.rentInstallments) {
    if (installment.day === 0) {
      cash -= installment.amount;
      ledger.push({ day: 0, amount: -installment.amount, category: "rent" });
    } else {
      loans.push({
        id: newId("rent"),
        kind: "rent",
        principal: installment.amount,
        balance: installment.amount,
        takenDay: 0,
        dueDay: installment.day,
        lateSinceDay: null,
        warningDay: null,
        finalDeadlineDay: null,
      });
    }
  }

  const plots: PlotState[] = Array.from({ length: economy.plotCount }, (_, id) => ({
    id,
    status: "empty",
    crop: null,
    known: null,
  }));

  const rng = Rng.fromSeed(seed);
  const weather = initialWeather(data, rng);
  const flood = planFlood(data, rng);

  const state: GameState = {
    version: STATE_VERSION,
    seed,
    rngState: rng.state,
    nextId,
    day: 0,
    phase: { kind: "briefing" },
    energy: economy.energy.max,
    cash,
    uyTin: economy.startUyTin,
    weather,
    regionalAlerts: [],
    flood,
    market: { deviation: 0 },
    plots,
    harvestLots: [],
    advanceContracts: [],
    loans,
    hiredWorkAvailable: false,
    hiredWorkUyTin: { seasonKey: seasonKeyOfDay(0, data.calendar), gained: 0 },
    rentExtensionsUsed: 0,
    debtStage: 0,
    landAccess: true,
    settledSeasons: [],
    ledger,
    log: [{ day: 0, kind: "gameStarted", seed }],
    stats: {
      peakCash: cash,
      largestDebt: Math.max(0, ...loans.map((l) => l.balance)),
      maxDebtStage: 0,
      nearBankruptcyCount: 0,
      seasonsCompleted: 0,
    },
  };
  const withWork = rollHiredWork(state, data, rng, 0);
  return { ...withWork, rngState: rng.state };
}
