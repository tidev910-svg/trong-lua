import type { Forecast } from "../../core/types";
import { money } from "../format";
import { Bar } from "./Bar";
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
