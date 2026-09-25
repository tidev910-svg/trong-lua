import type { SaveFile } from "./save";
import type { GameState } from "./types";

/**
 * Playtest data kept in the save file (M4.1). Everything here is derived from the save and state,
 * so it never affects replay; the UI adds wall-clock times (core has no clock).
 */
export interface PlaytestStats {
  /** Day the player last reached (where they stopped if they never came back). */
  lastDay: number;
  endReason: "yearEnd" | "bankrupt" | "quit" | "inProgress";
  actions: number;
  /** Number of "Tua đến khi…" uses, and days covered by them. */
  skipCount: number;
  skippedDays: number;
  /** Why skips stopped, counted. */
  skipStops: Record<string, number>;
  /** Days the player went to the field. */
  fieldVisits: number;
  maxDebtStage: number;
  nearBankruptcyCount: number;
  seasonsSettled: number;
}

export interface PlaytestMeta extends PlaytestStats {
  /** ISO time the save was first created and last written (added by the UI). */
  startedAt?: string;
  lastPlayedAt?: string;
  /** Times the game was opened with this save. */
  sessions?: number;
}

export function playtestStats(save: SaveFile, state: GameState): PlaytestStats {
  const skips = state.log.filter((e) => e.kind === "skipStopped");
  const skipStops: Record<string, number> = {};
  for (const e of skips) if (e.kind === "skipStopped") skipStops[e.reason] = (skipStops[e.reason] ?? 0) + 1;
  return {
    lastDay: state.day,
    endReason: state.phase.kind === "gameOver" ? state.phase.reason : "inProgress",
    actions: save.actions.length,
    skipCount: save.actions.filter((a) => a.type === "skipUntil").length,
    skippedDays: skips.reduce((sum, e) => sum + (e.kind === "skipStopped" ? e.days : 0), 0),
    skipStops,
    fieldVisits: save.actions.filter((a) => a.type === "chooseActivity" && a.activity === "field").length,
    maxDebtStage: state.stats.maxDebtStage,
    nearBankruptcyCount: state.stats.nearBankruptcyCount,
    seasonsSettled: state.settledSeasons.length,
  };
}
