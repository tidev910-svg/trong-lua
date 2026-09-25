import type { GameData } from "../data/schemas";
import type { SaveFile } from "./save";
import { netWorth } from "./summary";
import type { GameState } from "./types";

/**
 * Expected outcome stored with a golden replay (tests/replays, M3.4). Kept to values a port can compare:
 * integers exactly, floats with a small tolerance.
 */
export interface GoldenExpectation {
  day: number;
  phase: GameState["phase"];
  rngState: number;
  cash: number;
  uyTin: number;
  debtStage: number;
  landAccess: boolean;
  netWorth: number;
  settledSeasons: string[];
  loans: { id: string; kind: string; balance: number; dueDay: number }[];
  plots: { id: number; status: string; growth: number | null; health: number | null; water: number | null }[];
  ledgerEntries: number;
  logEntries: number;
}

export interface GoldenReplay {
  description: string;
  save: SaveFile;
  expected: GoldenExpectation;
}

export function goldenOf(state: GameState, data: GameData): GoldenExpectation {
  return {
    day: state.day,
    phase: state.phase,
    rngState: state.rngState,
    cash: state.cash,
    uyTin: state.uyTin,
    debtStage: state.debtStage,
    landAccess: state.landAccess,
    netWorth: netWorth(state, data),
    settledSeasons: state.settledSeasons,
    loans: state.loans.map((l) => ({ id: l.id, kind: l.kind, balance: l.balance, dueDay: l.dueDay })),
    plots: state.plots.map((p) => ({
      id: p.id,
      status: p.status,
      growth: p.crop?.growth ?? null,
      health: p.crop?.health ?? null,
      water: p.crop?.water ?? null,
    })),
    ledgerEntries: state.ledger.length,
    logEntries: state.log.length,
  };
}
