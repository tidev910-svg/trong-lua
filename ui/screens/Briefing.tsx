import { useState } from "react";
import type { Game } from "../useGame";
import { dayLabel, eventText, LOAN_KIND, money, percent, STAGE, STOP_REASON, varietyName, WEATHER } from "../format";
import { SkipDialog } from "./SkipDialog";
import type { PlotView } from "../../core/playerView";
import type { CropStage } from "../../core/types";

const STAGE_ORDER: CropStage[] = ["germination", "tillering", "panicle", "flowering", "ripening", "harvestable"];

/** Expected stage today and the next change, from the public schedule. */
function scheduleLine(plot: PlotView, day: number): string {
  if (!plot.crop) return "";
  const e = plot.crop.expected;
  const current = [...STAGE_ORDER].reverse().find((s) => day >= e[s]) ?? "germination";
  const next = STAGE_ORDER[STAGE_ORDER.indexOf(current) + 1];
  const nextText = next ? ` · ${STAGE[next]} sau ${e[next] - day} ngày` : "";
  return `dự kiến ${STAGE[current]}${nextText}`;
}

/** "Bản tin buổi sáng" (spec §12.1), also used to pick the afternoon's activity. */
export function Briefing({ game }: { game: Game }) {
  const { view, act, data } = game;
  const [skipping, setSkipping] = useState(false);
  const isMorning = view.phase.kind === "briefing";
  const lastSkip = [...view.recentEvents].reverse().find((e) => e.kind === "skipStopped" && e.day === view.day);
  const news = view.recentEvents.map(eventText).filter((t): t is string => t !== null);
  const nearest = [...view.loans].sort((a, b) => a.dueDay - b.dueDay)[0];
  const pestName = (id: string) => data.pests.find((p) => p.id === id)?.name ?? id;

  return (
    <section>
      <h2>{isMorning ? "Bản tin buổi sáng" : "Buổi chiều – làm gì tiếp?"}</h2>
      {lastSkip && lastSkip.kind === "skipStopped" && (
        <p className="notice">
          Đã tua {lastSkip.days} ngày. Dừng vì: <b>{STOP_REASON[lastSkip.reason]}</b>
        </p>
      )}

      <div className="cards">
        <div className="card">
          <h3>Thời tiết</h3>
          <p>Hôm qua: {view.weather.yesterday ? WEATHER[view.weather.yesterday] : "–"}</p>
          <table>
            <tbody>
              {view.weather.forecast.map((f, i) => (
                <tr key={f.day}>
                  <td>{i === 0 ? "Hôm nay" : dayLabel(view, f.day)}</td>
                  <td className={f.predicted === "storm" || f.predicted === "heavy_rain" ? "bad" : ""}>{WEATHER[f.predicted]}</td>
                  <td className="muted">tin cậy {percent(f.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Radio</h3>
          {view.radio.pestAlerts.map((a) => (
            <p key={a.pestId} className="bad">
              Cảnh báo dịch {pestName(a.pestId)} đến {dayLabel(view, a.endDay)}.
            </p>
          ))}
          {view.radio.floodWarning && <p className="bad">Dự báo lũ về khoảng {dayLabel(view, view.radio.floodWarning.predictedDay)}.</p>}
          <p>
            Giá lúa hôm nay: {money(view.market.pricePerKg)}/kg{view.market.glut ? " (đang gặt rộ, giá bị ép)" : ""}
          </p>
          <p>{view.hiredWorkAvailable ? "Hôm nay có người thuê làm." : "Hôm nay không ai thuê làm."}</p>
          {news.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>

        <div className="card">
          <h3>Tiền nong</h3>
          <p>Tiền mặt: <b>{money(view.cash)}</b></p>
          {nearest && (
            <p>
              Gần hạn nhất: {LOAN_KIND[nearest.kind]} {money(nearest.balance)} – ngày {dayLabel(view, nearest.dueDay)}
              {nearest.lateSinceDay !== null ? " (đã quá hạn)" : ` (còn ${nearest.dueDay - view.day} ngày)`}
            </p>
          )}
        </div>
      </div>

      <h3>Ruộng</h3>
      <table className="plots">
        <thead>
          <tr>
            <th>Thửa</th>
            <th>Lúa</th>
            <th>Lịch vụ</th>
            <th>Lần cuối thăm</th>
          </tr>
        </thead>
        <tbody>
          {view.plots.map((p) => (
            <tr key={p.id}>
              <td>{p.id + 1}</td>
              <td>{p.crop ? `${varietyName(p.crop.varietyId, data.varieties)} (gieo ${dayLabel(view, p.crop.sowDay)})` : p.status === "harvested" ? "Đã gặt" : "Trống"}</td>
              <td>{scheduleLine(p, view.day)}</td>
              <td>{p.known ? (view.day === p.known.lastVisitDay ? "hôm nay" : `${view.day - p.known.lastVisitDay} ngày trước`) : "chưa thăm"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="actions">
        <button disabled={!view.landAccess} onClick={() => act({ type: "chooseActivity", activity: "field" })}>
          Ra đồng (−{data.economy.energy.fieldVisit} sức)
        </button>
        <button disabled={!view.hiredWorkAvailable} onClick={() => act({ type: "chooseActivity", activity: "hired_work" })}>
          Đi làm thuê (+{money(data.economy.hiredWork.wageHalfDay)}, −{data.economy.hiredWork.energyCost} sức)
        </button>
        <button onClick={() => act({ type: "chooseActivity", activity: "rest" })}>Nghỉ (+{data.economy.energy.restHalfDay} sức)</button>
        {isMorning && <button onClick={() => setSkipping(true)}>Tua đến khi…</button>}
      </div>
      {skipping && <SkipDialog game={game} onClose={() => setSkipping(false)} />}
    </section>
  );
}
