import type { GameData } from "../data/schemas";
import { Rng } from "./rng";
import { enterSettlementIfDue } from "./settlement";
import { lastDay } from "./systems/calendar";
import { updateDebtSpiral } from "./systems/debt";
import { checkLoans, payMandatoryCosts, repayStoreCreditFromSale, rollHiredWork, settleNegativeCash } from "./systems/finance";
import { updateGrowth } from "./systems/growth";
import { ageLots } from "./systems/harvest";
import { announceFlood, updateHealth } from "./systems/health";
import { updateMarket } from "./systems/market";
import { updatePests, updateRegionalAlerts } from "./systems/pests";
import { updateWater } from "./systems/water";
import { advanceWeather } from "./systems/weather";
import type { GameState } from "./types";

/**
 * Simulates the night of state.day in the fixed order of spec §9. Every system shares one RNG, created from
 * state.rngState and written back at the end, so the draw order is part of the contract (keep it when porting).
 */
export function runNight(state: GameState, data: GameData): GameState {
  const rng = Rng.fromState(state.rngState);
  let s = state;

  // 1. Weather: realize today, draw day + 3, forecast for tomorrow's briefing
  s = advanceWeather(s, data, rng);
  // 2. Water
  s = updateWater(s, data);
  // 3. Growth
  s = updateGrowth(s, data);
  // 4. Pests
  s = updatePests(s, data, rng);
  // 5. Health (water stress, storm, lodging, flood)
  s = updateHealth(s, data, rng);
  // 6. Events: pest alerts, flood warning, hired work tomorrow
  s = updateRegionalAlerts(s, data, rng);
  s = announceFlood(s);
  s = rollHiredWork(s, data, rng);
  // 7. Finance: lots age (auto-sale), living cost, Tết, arrears, interest, due dates
  const aged = ageLots(s, data);
  s = aged.autoSold.length > 0 ? repayStoreCreditFromSale(aged.state, data) : aged.state;
  s = payMandatoryCosts(s, data);
  s = settleNegativeCash(s);
  s = checkLoans(s, data);
  // 8. Debt spiral (may end the game)
  s = updateDebtSpiral(s, data);

  // 9. New day: energy, date, market price — or the end of the year
  if (s.phase.kind !== "gameOver") {
    if (s.day >= lastDay(data.calendar)) {
      s = { ...s, phase: { kind: "gameOver", reason: "yearEnd" } };
    } else {
      s = {
        ...s,
        day: s.day + 1,
        energy: Math.min(data.economy.energy.max, s.energy + data.economy.energy.nightRestore),
        phase: { kind: "briefing" },
      };
      s = updateMarket(s, data, rng);
      s = enterSettlementIfDue(s, { kind: "briefing" });
    }
  }
  s = { ...s, stats: { ...s.stats, peakCash: Math.max(s.stats.peakCash, s.cash) } };
  return { ...s, rngState: rng.state };
}
