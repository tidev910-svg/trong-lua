import { useState } from "react";
import type { Game } from "../useGame";
import { ALL_STOP_CONDITIONS, type StopCondition } from "../../core/types";

const LABELS: Record<StopCondition, string> = {
  severeForecast: "Dự báo mưa lớn hoặc bão",
  pestAlert: "Có cảnh báo dịch trên radio",
  stageChange: "Có thửa dự kiến sang giai đoạn mới",
  debtDueSoon: "Còn ≤ 3 ngày tới hạn một khoản nợ",
};

/** "Tua đến khi…" (spec §3, M2.7). */
export function SkipDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const [activity, setActivity] = useState<"rest" | "hired_work">("hired_work");
  const [stopOn, setStopOn] = useState<StopCondition[]>([...ALL_STOP_CONDITIONS]);
  const [maxDays, setMaxDays] = useState(7);

  const toggle = (c: StopCondition) => setStopOn((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));
  const run = () => {
    if (game.act({ type: "skipUntil", defaultActivity: activity, stopOn, maxDays })) onClose();
  };

  return (
    <div className="dialog">
      <h3>Tua đến khi…</h3>
      <p>
        Mỗi buổi:{" "}
        <label>
          <input type="radio" checked={activity === "hired_work"} onChange={() => setActivity("hired_work")} /> đi làm thuê (không có việc thì nghỉ)
        </label>{" "}
        <label>
          <input type="radio" checked={activity === "rest"} onChange={() => setActivity("rest")} /> nghỉ
        </label>
      </p>
      <p>Dừng khi:</p>
      {ALL_STOP_CONDITIONS.map((c) => (
        <label key={c} className="block">
          <input type="checkbox" checked={stopOn.includes(c)} onChange={() => toggle(c)} /> {LABELS[c]}
        </label>
      ))}
      <label className="block">
        Hoặc sau <input type="number" min={1} max={365} value={maxDays} onChange={(e) => setMaxDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} /> ngày
      </label>
      <p className="muted">Luôn dừng khi: bão, lũ, chủ nợ đến nhà, tới hạn tiền thuê, lúa dự kiến chín, Tết.</p>
      <div className="actions">
        <button onClick={run}>Tua</button>
        <button onClick={onClose}>Thôi</button>
      </div>
    </div>
  );
}
