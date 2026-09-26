import type { WeatherState } from "../../data/schemas";

/** Rain level drawn from today's forecast (the true weather today is hidden). */
export function rainClass(weather: WeatherState | undefined): string {
  if (weather === "rain") return "rain on";
  if (weather === "heavy_rain" || weather === "storm") return "rain on heavy";
  return "rain";
}

/** Rain overlay above the scene (a div outside the SVG). */
export function Rain({ weather }: { weather: WeatherState | undefined }) {
  return <div className={rainClass(weather)} aria-hidden="true" />;
}
