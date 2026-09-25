import type { GameData } from "../data/schemas";
import { getPlayerView } from "../core/playerView";
import { dispatch, newSession, type Session } from "../core/save";
import { summarize, type RunSummary } from "../core/summary";
import type { Action, GameState } from "../core/types";
import { decide, type Policy } from "./bots/policy";

export type FailureCause = "bankrupt" | "landLost" | null;

export interface GameResult {
  bot: string;
  summary: RunSummary;
  failure: FailureCause;
  /** Cash seen by the bot each day (days skipped over carry the last value seen). */
  cashByDay: number[];
  refusals: Record<string, number>;
  steps: number;
}

const MAX_STEPS = 50_000;

function fallback(state: GameState): Action {
  switch (state.phase.kind) {
    case "settlement":
      return { type: "acknowledge" };
    case "briefing":
      return { type: "skipUntil", defaultActivity: "rest", stopOn: [], maxDays: 1 };
    case "halfDay":
      return state.phase.activity === "field" ? { type: "endHalfDay" } : { type: "chooseActivity", activity: "rest" };
    case "gameOver":
      return { type: "quit" };
  }
}

/** Plays one full run with a bot that only sees getPlayerView (ARCHITECTURE "Bộ mô phỏng"). */
export function runGame(seed: number, policy: Policy, data: GameData): GameResult & { session: Session } {
  let session = newSession(seed, data);
  const days = data.calendar.daysInYear;
  const cashByDay: number[] = new Array<number>(days).fill(Number.NaN);
  const refusals: Record<string, number> = {};
  let steps = 0;

  while (session.state.phase.kind !== "gameOver" && steps < MAX_STEPS) {
    steps++;
    const view = getPlayerView(session.state, data);
    cashByDay[view.day] = view.cash;
    let out = dispatch(session, decide(view, policy, data), data);
    if (!out.result.ok) {
      refusals[out.result.reason] = (refusals[out.result.reason] ?? 0) + 1;
      out = dispatch(session, decide(view, policy, data, true), data);
    }
    if (!out.result.ok) {
      refusals[out.result.reason] = (refusals[out.result.reason] ?? 0) + 1;
      out = dispatch(session, fallback(session.state), data);
      if (!out.result.ok) throw new Error(`bot ${policy.name} stuck on day ${session.state.day}: ${out.result.reason}`);
    }
    session = out.session;
  }
  if (session.state.phase.kind !== "gameOver") throw new Error(`bot ${policy.name} seed ${seed} did not finish in ${MAX_STEPS} steps`);

  let last = cashByDay[0] ?? 0;
  for (let d = 0; d < days; d++) {
    const v = cashByDay[d];
    if (v === undefined || Number.isNaN(v)) cashByDay[d] = last;
    else last = v;
  }

  const state = session.state;
  const failure: FailureCause = state.phase.kind === "gameOver" && state.phase.reason === "bankrupt" ? "bankrupt" : !state.landAccess ? "landLost" : null;
  return { bot: policy.name, summary: summarize(state, data), failure, cashByDay, refusals, steps, session };
}
