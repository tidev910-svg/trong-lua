import type { GameData } from "../data/schemas";
import { visitField } from "./field";
import { runNight } from "./night";
import { doHiredWork, hiredWorkRefusal } from "./systems/finance";
import type { Activity, GameState, HalfDay } from "./types";

/** Slot of the half-day waiting for an activity, or null when no activity can be chosen now. */
export function slotAwaitingActivity(state: GameState): HalfDay | null {
  if (state.phase.kind === "briefing") return "morning";
  if (state.phase.kind === "halfDay" && state.phase.activity === null) return state.phase.slot;
  return null;
}

/** Ends the current half-day: morning → afternoon, afternoon → the night runs and a new day starts. */
export function endHalfDay(state: GameState, data: GameData): GameState {
  const slot = state.phase.kind === "halfDay" ? state.phase.slot : "morning";
  if (slot === "morning") return { ...state, phase: { kind: "halfDay", slot: "afternoon", activity: null } };
  return runNight(state, data);
}

/** Why the activity cannot be chosen now, or null. */
export function activityRefusal(state: GameState, activity: Activity, data: GameData): string | null {
  if (slotAwaitingActivity(state) === null) return "Bây giờ không chọn việc được.";
  if (activity === "field") {
    if (!state.landAccess) return "Đã mất ruộng, không ra đồng được.";
    if (state.energy < data.economy.energy.fieldVisit) return "Không đủ sức lực ra đồng.";
  }
  if (activity === "hired_work") return hiredWorkRefusal(state, data);
  return null;
}

/**
 * Starts the chosen activity for the waiting half-day (spec §3):
 * field → visit (energy fieldVisit, all plots observed), stays in the half-day for field actions;
 * hired_work / rest → applied and the half-day ends at once.
 */
export function startActivity(state: GameState, activity: Activity, data: GameData): GameState {
  const slot = slotAwaitingActivity(state) ?? "morning";
  const inHalfDay: GameState = { ...state, phase: { kind: "halfDay", slot, activity: null } };
  if (activity === "field") {
    const visited = visitField({ ...inHalfDay, energy: inHalfDay.energy - data.economy.energy.fieldVisit }, data);
    return { ...visited, phase: { kind: "halfDay", slot, activity: "field" } };
  }
  if (activity === "hired_work") return endHalfDay(doHiredWork(inHalfDay, data), data);
  const rested = { ...inHalfDay, energy: Math.min(data.economy.energy.max, inHalfDay.energy + data.economy.energy.restHalfDay) };
  return endHalfDay(rested, data);
}
