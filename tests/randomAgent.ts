import type { GameData } from "../data/schemas";
import { Rng } from "../core/rng";
import { dispatch, newSession, type Session } from "../core/save";
import { ALL_STOP_CONDITIONS, type Action, type GameState } from "../core/types";

/** Candidate actions for the current state; many will be refused, which is part of what gets tested. */
function candidates(state: GameState, data: GameData): Action[] {
  const plots = state.plots.map((p) => p.id);
  const pay = ["cash", "store_credit"] as const;
  const list: Action[] = [
    { type: "chooseActivity", activity: "field" },
    { type: "chooseActivity", activity: "rest" },
    { type: "chooseActivity", activity: "hired_work" },
    { type: "endHalfDay" },
    { type: "acknowledge" },
    { type: "skipUntil", defaultActivity: "hired_work", stopOn: [...ALL_STOP_CONDITIONS], maxDays: 10 },
    { type: "takeLoanShark", amount: 1_000_000 },
    { type: "requestRentExtension" },
    { type: "reRent" },
  ];
  for (const plotId of plots) {
    for (const payWith of pay) {
      list.push({ type: "prepareAndSow", plotId, variety: data.varieties[plotId % 2]?.id ?? "variety_a", method: plotId % 2 ? "transplant" : "broadcast", payWith });
      list.push({ type: "fertilize", plotId, payWith });
      list.push({ type: "spray", plotId, pest: data.pests[plotId % 2]?.id ?? "rice_blast", mode: plotId % 2 ? "cure" : "preventive", payWith });
    }
    list.push({ type: "adjustWater", plotId }, { type: "harvest", plotId, method: plotId % 2 ? "hand" : "machine" }, { type: "sellAdvance", plotId, ratio: 0.4 });
  }
  for (const lot of state.harvestLots) list.push({ type: "sellLot", lotId: lot.id });
  for (const loan of state.loans) {
    list.push({ type: "repay", loanId: loan.id, amount: Math.min(loan.balance, Math.max(1, state.cash)) });
    list.push({ type: "rollOverLoan", loanId: loan.id });
  }
  return list;
}

/** Plays a whole run with random (but seeded) choices; returns the session and how many actions were refused. */
export function playRandom(seed: number, data: GameData, maxSteps = 5000): { session: Session; refused: number } {
  const chooser = Rng.fromSeed(seed ^ 0x5eed);
  let session = newSession(seed, data);
  let refused = 0;
  for (let step = 0; step < maxSteps && session.state.phase.kind !== "gameOver"; step++) {
    const options = candidates(session.state, data);
    const action = options[chooser.nextInt(0, options.length - 1)] as Action;
    const out = dispatch(session, action, data);
    if (!out.result.ok) refused++;
    session = out.session;
  }
  return { session, refused };
}
