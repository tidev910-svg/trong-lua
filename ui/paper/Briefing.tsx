import type { GameData } from "../../data/schemas";
import type { PlayerView } from "../../core/playerView";
import { forecastConfidence, WEATHER_WORDS } from "../hud/labels";
import { WeatherIcon } from "../hud/WeatherIcon";
import { briefingTitle, debtStageLine, lastVisitLine, moneyLine, plotLine, radioLines, skipStopLine, yesterdayLine } from "./briefingText";
import { Notebook } from "./Notebook";
import { TypedText } from "./TypedText";

const DAY_NAMES = ["Hôm nay", "Ngày mai", "Ngày mốt"];

interface Props {
  view: PlayerView;
  data: GameData;
  /** "Bắt đầu ngày": closes the notebook (UI only; the morning's activity is chosen in the scene). */
  onStartDay: () => void;
  onSkip: () => void;
  /** Tua is offered only in the morning briefing (core: skipUntil from the briefing). */
  canSkip: boolean;
}

/** Morning briefing notebook (spec §12.1): yesterday, forecast, radio, fields as last seen, money. */
export function Briefing({ view, data, onStartDay, onSkip, canSkip }: Props) {
  const stop = skipStopLine(view);
  const yesterday = yesterdayLine(view);
  const debt = debtStageLine(view);
  return (
    <Notebook title={briefingTitle(view)} onClose={onStartDay}>
      {stop && <p className="alert">{stop}</p>}
      <h4>Trời</h4>
      {yesterday && <p>{yesterday}</p>}
      <div className="fc">
        {view.weather.forecast.map((f, i) => (
          <div key={f.day}>
            <WeatherIcon weather={f.predicted} size={28} />
            <span>
              {DAY_NAMES[i]}: {WEATHER_WORDS[f.predicted]} <small>({forecastConfidence(i)})</small>
            </span>
          </div>
        ))}
      </div>
      <h4>Radio</h4>
      <TypedText className="typed" text={radioLines(view, data).join("\n")} />
      <h4>Ruộng</h4>
      <p>{lastVisitLine(view)}</p>
      {view.plots.map((p) => {
        const line = plotLine(p);
        return (
          <p key={p.id}>
            {line.text}
            {line.signs && <span className="neg">, có dấu hiệu lạ</span>}
          </p>
        );
      })}
      <h4>Tiền</h4>
      <p>{moneyLine(view)}</p>
      {debt && <p className="neg">{debt}</p>}
      <div className="row">
        <button type="button" className="btn" onClick={onStartDay}>
          Bắt đầu ngày
        </button>
        {canSkip && (
          <button type="button" className="btn ghost" onClick={onSkip}>
            Tua đến khi…
          </button>
        )}
      </div>
    </Notebook>
  );
}
