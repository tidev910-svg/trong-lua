import type { GameData } from "../data/schemas";
import { activityRefusal, startActivity } from "./phases";
import { isTetDay } from "./systems/calendar";
import { expectedSchedule } from "./systems/growth";
import type { GameEvent, GameState, StopCondition } from "./types";

export type StopReason =
  | "storm"
  | "flood"
  | "floodWarning"
  | "creditorVisit"
  | "foreclosure"
  | "landLost"
  | "rentDue"
  | "tet"
  | "harvestable"
  | "severeForecast"
  | "pestAlert"
  | "stageChange"
  | "debtDueSoon"
  | "maxDays"
  | "phaseChange";

export const MAX_SKIP_DAYS = 365;

const SEVERE = new Set(["heavy_rain", "storm"]);

function eventsOn(state: GameState, days: readonly number[], kind: GameEvent["kind"]): boolean {
  return state.log.some((e) => e.kind === kind && days.includes(e.day));
}

/** Public schedule entries (decision A13) that fall on `day`, for plots with a crop. */
function scheduledOn(state: GameState, day: number, data: GameData): { harvestable: boolean; stageChange: boolean } {
  let harvestable = false;
  let stageChange = false;
  for (const plot of state.plots) {
    if (plot.crop === null || plot.status !== "growing") continue;
    const schedule = expectedSchedule(plot.crop.sowDay, plot.crop.varietyId, data);
    if (schedule.harvestable === day) harvestable = true;
    if (schedule.tillering === day || schedule.panicle === day || schedule.flowering === day || schedule.ripening === day) {
      stageChange = true;
    }
  }
  return { harvestable, stageChange };
}

/**
 * Why a skip stops on the morning of `now.day`, comparing with the previous morning `before` so that only
 * new things stop it (decision B15). Uses only what the player can know, plus the always-stop events.
 */
export function stopReason(before: GameState, now: GameState, stopOn: readonly StopCondition[], data: GameData): StopReason | null {
  const day = now.day;
  const lastNight = [day - 1, day];

  // Always stop (spec §3)
  if (now.weather.realized === "storm") return "storm";
  if (eventsOn(now, lastNight, "flood")) return "flood";
  if (eventsOn(now, [day], "floodWarning")) return "floodWarning";
  if (eventsOn(now, [day], "creditorVisit")) return "creditorVisit";
  if (eventsOn(now, lastNight, "foreclosure")) return "foreclosure";
  if (eventsOn(now, lastNight, "landLost")) return "landLost";
  if (now.loans.some((l) => l.kind === "rent" && l.dueDay === day)) return "rentDue";
  if (isTetDay(day, data.calendar)) return "tet";
  const scheduled = scheduledOn(now, day, data);
  if (scheduled.harvestable) return "harvestable";

  // Chosen conditions
  if (stopOn.includes("severeForecast")) {
    const wasSevere = (d: number) => before.weather.forecast.some((f) => f.day === d && SEVERE.has(f.predicted));
    if (now.weather.forecast.slice(0, 2).some((f) => SEVERE.has(f.predicted) && !wasSevere(f.day))) return "severeForecast";
  }
  if (stopOn.includes("pestAlert") && now.regionalAlerts.some((a) => a.startDay === day)) return "pestAlert";
  if (stopOn.includes("stageChange") && scheduled.stageChange) return "stageChange";
  if (stopOn.includes("debtDueSoon")) {
    const soon = (s: GameState, id: string) => {
      const loan = s.loans.find((l) => l.id === id);
      return loan !== undefined && loan.lateSinceDay === null && loan.dueDay - s.day <= 3;
    };
    if (now.loans.some((l) => soon(now, l.id) && !soon(before, l.id))) return "debtDueSoon";
  }
  return null;
}

/**
 * "Tua đến khi…" (spec §3, ARCHITECTURE): each day plays the default activity in both half-days
 * (hired work falls back to rest when there is none or energy is short), runs the night, then checks stops.
 * Stops after maxDays, or when the day does not start at the briefing (settlement, game over).
 */
export function runSkip(
  state: GameState,
  defaultActivity: "rest" | "hired_work",
  stopOn: readonly StopCondition[],
  maxDays: number,
  data: GameData,
): { state: GameState; stoppedBy: StopReason; days: number } {
  let s = state;
  for (let dayCount = 1; dayCount <= maxDays; dayCount++) {
    const before = s;
    for (let half = 0; half < 2; half++) {
      const activity = defaultActivity === "hired_work" && activityRefusal(s, "hired_work", data) === null ? "hired_work" : "rest";
      s = startActivity(s, activity, data);
    }
    if (s.phase.kind !== "briefing") return { state: s, stoppedBy: "phaseChange", days: dayCount };
    const reason = stopReason(before, s, stopOn, data);
    if (reason !== null) return { state: s, stoppedBy: reason, days: dayCount };
  }
  return { state: s, stoppedBy: "maxDays", days: maxDays };
}
