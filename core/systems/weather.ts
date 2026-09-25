import { WEATHER_STATES, type GameData, type WeatherState } from "../../data/schemas";
import type { Rng } from "../rng";
import type { Forecast, GameState, WeatherInfo } from "../types";
import { monthKeyOfDay } from "./calendar";

/**
 * True weather for `day` (spec §6): with probability `persistence` keep the previous
 * day's weather, otherwise draw from that month's distribution.
 * With no previous day (game start) it draws straight from the distribution.
 * Draws: chance (only if prev != null), then pickWeighted (only if not kept).
 */
export function drawWeather(prev: WeatherState | null, day: number, data: GameData, rng: Rng): WeatherState {
  if (prev !== null && rng.chance(data.weather.persistence)) return prev;
  const distribution = data.weather.distributionByMonth[monthKeyOfDay(day, data.calendar)];
  return rng.pickWeighted(WEATHER_STATES, (w) => distribution[w]);
}

/**
 * Forecast of a known true weather (spec §6 + DATA_SPEC): right with probability `accuracy`,
 * otherwise a uniformly chosen neighbor of the true state.
 * Draws: chance, then nextInt (only if wrong).
 */
export function forecastOf(truth: WeatherState, day: number, accuracy: number, data: GameData, rng: Rng): Forecast {
  if (rng.chance(accuracy)) return { day, predicted: truth, accuracy };
  const neighbors = data.weather.neighbors[truth];
  const predicted = neighbors[rng.nextInt(0, neighbors.length - 1)] ?? truth;
  return { day, predicted, accuracy };
}

/** Forecasts for [firstDay, firstDay + 1, firstDay + 2] from the true queue, in that order. */
export function forecastQueue(
  queue: WeatherInfo["queue"],
  firstDay: number,
  data: GameData,
  rng: Rng,
): WeatherInfo["forecast"] {
  const { today, plus1, plus2 } = data.weather.forecastAccuracy;
  return [
    forecastOf(queue[0], firstDay, today, data, rng),
    forecastOf(queue[1], firstDay + 1, plus1, data, rng),
    forecastOf(queue[2], firstDay + 2, plus2, data, rng),
  ];
}

/** Weather at game start: true weather for days 0–2 (decision B4) and the day-0 forecast. */
export function initialWeather(data: GameData, rng: Rng): WeatherInfo {
  const d0 = drawWeather(null, 0, data, rng);
  const d1 = drawWeather(d0, 1, data, rng);
  const d2 = drawWeather(d1, 2, data, rng);
  const queue: WeatherInfo["queue"] = [d0, d1, d2];
  return { queue, forecast: forecastQueue(queue, 0, data, rng), realized: null };
}

/**
 * Night step 1 for `state.day`: today's queued weather becomes `realized` (the other
 * night systems read it), the queue shifts and draws day + 3, and the forecast is
 * rebuilt for the coming morning (day + 1 … day + 3).
 */
export function advanceWeather(state: GameState, data: GameData, rng: Rng): GameState {
  const [today, next, afterNext] = state.weather.queue;
  const newDay = drawWeather(afterNext, state.day + 3, data, rng);
  const queue: WeatherInfo["queue"] = [next, afterNext, newDay];
  return {
    ...state,
    weather: { queue, forecast: forecastQueue(queue, state.day + 1, data, rng), realized: today },
  };
}
