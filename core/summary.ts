import type { GameData } from "../data/schemas";
import { allDebt } from "./systems/finance";
import { lotValue } from "./systems/harvest";
import type { GameState } from "./types";

/** Decision A12: cash + unsold lots at trader price − every loan balance. Crops in the ground count 0. */
export function netWorth(state: GameState, data: GameData): number {
  const lots = state.harvestLots.reduce((s, lot) => s + lotValue(state, lot, data), 0);
  return state.cash + lots - allDebt(state);
}

/** "Thẻ tổng kết" (spec §11). */
export interface RunSummary {
  seed: number;
  endReason: "yearEnd" | "bankrupt" | "quit" | "inProgress";
  lastDay: number;
  seasonsCompleted: number;
  netWorth: number;
  peakCash: number;
  largestDebt: number;
  uyTin: number;
  nearBankruptcyCount: number;
  maxDebtStage: number;
  landAccess: boolean;
}

export function summarize(state: GameState, data: GameData): RunSummary {
  return {
    seed: state.seed,
    endReason: state.phase.kind === "gameOver" ? state.phase.reason : "inProgress",
    lastDay: state.day,
    seasonsCompleted: state.settledSeasons.length,
    netWorth: netWorth(state, data),
    peakCash: state.stats.peakCash,
    largestDebt: state.stats.largestDebt,
    uyTin: state.uyTin,
    nearBankruptcyCount: state.stats.nearBankruptcyCount,
    maxDebtStage: state.stats.maxDebtStage,
    landAccess: state.landAccess,
  };
}
