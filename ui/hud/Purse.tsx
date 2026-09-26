import type { Forecast } from "../../core/types";
import { money } from "../format";
import { forecastConfidence, WEATHER_WORDS } from "./labels";
import { WeatherIcon } from "./WeatherIcon";

interface Props {
  cash: number;
  energy: number;
  energyMax: number;
  uyTin: number;
  /** Today's forecast: the true weather of today is hidden (UI_DIRECTION). */
  forecastToday: Forecast | undefined;
}

const UY_TIN_MAX = 100;

function Bar({ value, max, className, label }: { value: number; max: number; className?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar${className ? ` ${className}` : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Purse (top right): cash in handwriting, energy, uy tín, today's forecast. */
export function Purse({ cash, energy, energyMax, uyTin, forecastToday }: Props) {
  return (
    <div className="hud purse">
      <div className="lbl">Tiền mặt</div>
      <div className={`cash${cash < 0 ? " neg" : ""}`}>{money(cash)}</div>
      <div className="lbl" style={{ marginTop: 8 }}>
        Sức lực {energy}/{energyMax}
      </div>
      <Bar value={energy} max={energyMax} label="Sức lực" />
      <div className="lbl">
        Uy tín trong làng {Math.round(uyTin)}/{UY_TIN_MAX}
      </div>
      <Bar value={uyTin} max={UY_TIN_MAX} className="uytin" label="Uy tín" />
      {forecastToday && (
        <div className="wx-now">
          <WeatherIcon weather={forecastToday.predicted} size={22} />
          <span>
            Dự báo hôm nay: {WEATHER_WORDS[forecastToday.predicted]} ({forecastConfidence(0)})
          </span>
        </div>
      )}
    </div>
  );
}
