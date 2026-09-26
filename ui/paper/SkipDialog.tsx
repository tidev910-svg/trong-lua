import { useState } from "react";
import type { GameData } from "../../data/schemas";
import { getActionOptions, quoteOption } from "../../core/actionOptions";
import type { PlayerView } from "../../core/playerView";
import { ALL_STOP_CONDITIONS, type Action, type StopCondition } from "../../core/types";
import { Notebook } from "./Notebook";

export const STOP_LABELS: Record<StopCondition, string> = {
  severeForecast: "Dự báo mưa lớn hoặc bão",
  pestAlert: "Radio báo có dịch",
  stageChange: "Lúa dự kiến sang giai đoạn mới",
  debtDueSoon: "Còn 3 ngày tới hạn một khoản nợ",
};

/** Skip lengths offered (UI_DIRECTION). */
export const SKIP_DAY_CHOICES = [3, 7, 14, 30] as const;

/** Events that always stop a skip (spec §3 + decision M1.12), as the player reads them. */
export const ALWAYS_STOP_TEXT = "Bão, lũ và tin báo lũ, chủ nợ đến nhà, bị siết nợ, mất ruộng, tới hạn tiền thuê, lúa dự kiến chín và Tết luôn làm dừng tua.";

interface Props {
  view: PlayerView;
  data: GameData;
  onStart: (action: Action) => void;
  onBack: () => void;
}

/** "Tua đến khi…" notebook (spec §12.4): default activity, stop conditions, maximum days. */
export function SkipDialog({ view, data, onStart, onBack }: Props) {
  const [activity, setActivity] = useState<"rest" | "hired_work">("rest");
  const [stops, setStops] = useState<StopCondition[]>([...ALL_STOP_CONDITIONS]);
  const [days, setDays] = useState<number>(7);
  const option = getActionOptions(view, { kind: "day" }).find((o) => o.id === "skip");
  const toggle = (c: StopCondition) => setStops((s) => (s.includes(c) ? s.filter((x) => x !== c) : ALL_STOP_CONDITIONS.filter((x) => x === c || s.includes(x))));

  const start = () => {
    if (!option) return;
    const quoted = quoteOption(view, option, days, data).action;
    if (quoted.type !== "skipUntil") return;
    onStart({ ...quoted, defaultActivity: activity, stopOn: stops });
  };

  return (
    <Notebook title="Tua đến khi…" onClose={onBack}>
      <p>Những ngày tua, mình sẽ:</p>
      <label className="check">
        <input type="radio" name="skip-activity" checked={activity === "rest"} onChange={() => setActivity("rest")} /> Nghỉ ở nhà
      </label>
      <label className="check">
        <input type="radio" name="skip-activity" checked={activity === "hired_work"} onChange={() => setActivity("hired_work")} /> Đi làm thuê khi có việc
      </label>
      <h4>Dừng lại khi</h4>
      {ALL_STOP_CONDITIONS.map((c) => (
        <label key={c} className="check">
          <input type="checkbox" checked={stops.includes(c)} onChange={() => toggle(c)} /> {STOP_LABELS[c]}
        </label>
      ))}
      <p>
        Tối đa{" "}
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Số ngày tối đa">
          {SKIP_DAY_CHOICES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>{" "}
        ngày
      </p>
      <p className="hint">{ALWAYS_STOP_TEXT}</p>
      {option && !option.enabled && option.reason && <p className="neg">{option.reason}</p>}
      <div className="row">
        <button type="button" className="btn" disabled={!option?.enabled} onClick={start}>
          Bắt đầu tua
        </button>
        <button type="button" className="btn ghost" onClick={onBack}>
          Quay lại bản tin
        </button>
      </div>
    </Notebook>
  );
}
