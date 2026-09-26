import type { WeatherState } from "../../data/schemas";
import type { PlayerView } from "../../core/playerView";
import type { WaterLevel } from "../../core/systems/water";

/** Confidence words for today / tomorrow / the day after (UI_DIRECTION "Chữ hiển thị"). */
export const FORECAST_CONFIDENCE = ["khá chắc", "tương đối", "chưa chắc"] as const;

export function forecastConfidence(index: number): string {
  return FORECAST_CONFIDENCE[Math.min(index, FORECAST_CONFIDENCE.length - 1)] ?? "";
}

/** Water as the player says it on paper. */
export const WATER_WORDS: Record<WaterLevel, string> = { low: "hơi cạn", ok: "vừa đủ", flooded: "ngập nhiều" };

export const WEATHER_WORDS: Record<WeatherState, string> = {
  sunny: "Nắng",
  cloudy: "Nhiều mây",
  rain: "Mưa",
  heavy_rain: "Mưa lớn",
  storm: "Bão",
};

/** Time of day as drawn: briefing (dawn), morning, afternoon or night (night only while the UI plays it). */
/** True ripeness as seen at the last visit (`known.ripeness`, 0–1). */
export function ripenessText(ripeness: number): string {
  return ripeness >= 1 ? "Lúa chín 100%: gặt được" : `Lúa chín ${Math.floor(ripeness * 100)}%`;
}

export type VisualPhase = "briefing" | "morning" | "afternoon" | "night";

/**
 * The phase to draw. `dayBegun` = the player closed the morning briefing (UI only: in core the briefing
 * is the morning waiting for an activity). `night` = the UI is playing the evening/night transition.
 */
export function visualPhase(view: Pick<PlayerView, "phase">, dayBegun: boolean, night: boolean): VisualPhase {
  if (night) return "night";
  const phase = view.phase;
  if (phase.kind === "halfDay") return phase.slot;
  if (phase.kind === "briefing") return dayBegun ? "morning" : "briefing";
  if (phase.kind === "settlement") return phase.resume.kind === "halfDay" ? phase.resume.slot : "morning";
  return "morning";
}
