import { describe, expect, it } from "vitest";
import { loadData } from "../../data/loadData";
import type { GameData } from "../../data/schemas";
import { createInitialState } from "../../core/init";
import { Rng } from "../../core/rng";
import { rollHiredWork } from "../../core/systems/finance";
import { planFlood } from "../../core/systems/health";
import { initialWeather } from "../../core/systems/weather";
import { STATE_VERSION } from "../../core/types";

const data = loadData();

describe("createInitialState", () => {
  it("is deterministic and plain JSON", () => {
    const a = createInitialState(123, data);
    expect(createInitialState(123, data)).toEqual(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it("starts on day 0 at the morning briefing", () => {
    const s = createInitialState(1, data);
    expect(s.version).toBe(STATE_VERSION);
    expect(s.day).toBe(0);
    expect(s.phase).toEqual({ kind: "briefing" });
    expect(s.log).toEqual([{ day: 0, kind: "gameStarted", seed: 1 }]);
  });

  it("stores the seed; RNG draws weather, the flood plan, then day-0 hired work", () => {
    const s = createInitialState(987654, data);
    expect(s.seed).toBe(987654);
    const rng = Rng.fromSeed(987654);
    expect(s.weather).toEqual(initialWeather(data, rng));
    expect(s.flood).toEqual(planFlood(data, rng));
    expect(s.hiredWorkAvailable).toBe(rollHiredWork(s, data, rng, 0).hiredWorkAvailable);
    expect(s.rngState).toBe(rng.state);
    expect(() => createInitialState(1.5, data)).toThrow(RangeError);
  });

  it("cash = startCash + family loan − rent due on day 0 (3.000.000 with DATA_SPEC)", () => {
    const s = createInitialState(1, data);
    const rentDay0 = data.economy.rentInstallments.filter((r) => r.day === 0).reduce((a, r) => a + r.amount, 0);
    expect(s.cash).toBe(data.economy.startCash + data.economy.familyLoan.amount - rentDay0);
    expect(s.cash).toBe(3_000_000);
  });

  it("family loan is owed in full, due on familyLoan.dueDay", () => {
    const family = createInitialState(1, data).loans.filter((l) => l.kind === "family");
    expect(family).toEqual([
      { id: "family-1", kind: "family", principal: 5_000_000, balance: 5_000_000, takenDay: 0, dueDay: 364, lateSinceDay: null, warningDay: null, finalDeadlineDay: null },
    ]);
  });

  it("later rent installments become rent loans due on their day; the day-0 installment is already paid", () => {
    const rent = createInitialState(1, data).loans.filter((l) => l.kind === "rent");
    expect(rent).toEqual([
      { id: "rent-2", kind: "rent", principal: 5_000_000, balance: 5_000_000, takenDay: 0, dueDay: 150, lateSinceDay: null, warningDay: null, finalDeadlineDay: null },
    ]);
  });

  it("ledger records the family loan received and the rent paid", () => {
    expect(createInitialState(1, data).ledger).toEqual([
      { day: 0, amount: 5_000_000, category: "loan_received", loanId: "family-1" },
      { day: 0, amount: -5_000_000, category: "rent" },
    ]);
  });

  it("follows installment days from data", () => {
    const custom: GameData = {
      ...data,
      economy: {
        ...data.economy,
        rentInstallments: [
          { day: 0, amount: 4_000_000 },
          { day: 100, amount: 3_000_000 },
          { day: 200, amount: 3_000_000 },
        ],
      },
    };
    const s = createInitialState(1, custom);
    expect(s.cash).toBe(3_000_000 + 5_000_000 - 4_000_000);
    expect(s.loans.filter((l) => l.kind === "rent").map((l) => [l.dueDay, l.balance])).toEqual([
      [100, 3_000_000],
      [200, 3_000_000],
    ]);
    expect(new Set(s.loans.map((l) => l.id)).size).toBe(s.loans.length);
  });

  it("has plotCount empty plots with nothing known yet", () => {
    const s = createInitialState(1, data);
    expect(s.plots).toHaveLength(data.economy.plotCount);
    s.plots.forEach((p, i) => expect(p).toEqual({ id: i, status: "empty", crop: null, known: null }));
  });

  it("full energy, starting uy tín, no debt stress, land rented", () => {
    const s = createInitialState(1, data);
    expect(s.energy).toBe(data.economy.energy.max);
    expect(s.uyTin).toBe(data.economy.startUyTin);
    expect(s.debtStage).toBe(0);
    expect(s.landAccess).toBe(true);
    expect(s.stats).toEqual({
      peakCash: 3_000_000,
      largestDebt: 5_000_000,
      maxDebtStage: 0,
      nearBankruptcyCount: 0,
      seasonsCompleted: 0,
    });
  });

  it("does not mutate data", () => {
    const before = JSON.stringify(data);
    createInitialState(5, data);
    expect(JSON.stringify(data)).toBe(before);
  });
});
