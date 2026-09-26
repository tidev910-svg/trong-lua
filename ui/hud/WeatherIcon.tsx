import type { WeatherState } from "../../data/schemas";

const CLOUD = "M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1A3.5 3.5 0 0 0 7 18z";

function drops(n: number) {
  return Array.from({ length: n }, (_, i) => <path key={i} d={`M${8 + i * 4} 19l-1.5 3`} stroke="#4e8fd0" strokeWidth={1.8} strokeLinecap="round" />);
}

function inner(weather: WeatherState) {
  switch (weather) {
    case "sunny":
      return (
        <>
          <circle cx={12} cy={12} r={5} fill="#f0b43a" />
          <g stroke="#f0b43a" strokeWidth={2} strokeLinecap="round">
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
          </g>
        </>
      );
    case "cloudy":
      return (
        <>
          <circle cx={8} cy={8} r={4} fill="#f0b43a" />
          <path d={CLOUD} fill="#aab4c3" />
        </>
      );
    case "rain":
      return (
        <>
          <path d={CLOUD} fill="#aab4c3" />
          {drops(2)}
        </>
      );
    case "heavy_rain":
      return (
        <>
          <path d={CLOUD} fill="#7d879a" />
          {drops(3)}
        </>
      );
    case "storm":
      return (
        <>
          <path d={CLOUD} fill="#5d6577" />
          <path d="M12 17l-2 4h3l-2 3" stroke="#f0c93a" strokeWidth={1.8} fill="none" />
        </>
      );
  }
}

/** Small weather icon (reference `wxIcon`). */
export function WeatherIcon({ weather, size = 26 }: { weather: WeatherState; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 26" aria-hidden="true">
      {inner(weather)}
    </svg>
  );
}
