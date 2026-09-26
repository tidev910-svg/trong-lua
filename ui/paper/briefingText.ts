import { plotName } from "../../core/names";
import type { GameData } from "../../data/schemas";
import type { PlayerView, PlotView } from "../../core/playerView";
import type { GameEvent, Loan } from "../../core/types";
import { DEBT_STAGE, LOAN_KIND, money, STAGE, STOP_REASON, dayLabel } from "../format";
import { WATER_WORDS, WEATHER_WORDS } from "../hud/labels";

/** Everything below is wording of what the view already says; no rule is computed here. */

/** One line of overnight news for the radio, or null for events not worth a line. */
export function newsLine(e: GameEvent, view: Pick<PlayerView, "date" | "day">): string | null {
  switch (e.kind) {
    case "floodWarning":
      return `Radio báo nước lũ dự kiến về khoảng ngày ${dayLabel(view, e.predictedDay)}.`;
    case "flood":
      return "Lũ về! Ruộng chưa gặt bị ngập.";
    case "lotSold":
      return e.auto ? `Lúa để quá lâu, thương lái mua rẻ: ${money(e.amount)}.` : null;
    case "loanLate":
      return `${LOAN_KIND[e.loanKind]} đã quá hạn.`;
    case "tet":
      return `Tết đến: chi thêm ${money(e.amount)}.`;
    case "creditorVisit":
      return `Chủ nợ (${LOAN_KIND[e.loanKind].toLowerCase()}) đến nhà. Hạn chót ngày ${dayLabel(view, e.finalDeadlineDay)}.`;
    case "foreclosure":
      return `Bị siết nợ: bán ép ${e.lotsSold} lô lúa${e.plotsSoldAdvance > 0 ? ", ép bán non lúa đang trồng" : ""}, được ${money(e.amount)}.`;
    case "landLost":
      return "Chủ đất lấy lại ruộng. Chỉ còn làm thuê hoặc nghỉ.";
    case "landReRented":
      return `Đã thuê lại ruộng (${money(e.amount)}).`;
    default:
      return null;
  }
}

export function briefingTitle(view: Pick<PlayerView, "date">): string {
  return `Sáng ngày ${view.date.dayOfMonth} tháng ${view.date.month}`;
}

/** Radio news, one line each: alerts, flood, price, hired work, what happened overnight. */
export function radioLines(view: PlayerView, data: GameData): string[] {
  const pestName = (id: string) => (data.pests.find((p) => p.id === id)?.name ?? id).toLowerCase();
  const lines: string[] = [];
  for (const a of view.radio.pestAlerts) {
    lines.push(`Trạm khuyến nông: ${pestName(a.pestId)} đang xuất hiện ở các ấp lân cận đến ngày ${dayLabel(view, a.endDay)}, bà con thăm đồng thường xuyên.`);
  }
  if (view.radio.floodWarning) lines.push(`Đài khí tượng: nước lũ có thể về khoảng ngày ${dayLabel(view, view.radio.floodWarning.predictedDay)}.`);
  lines.push(`Giá lúa tươi tại ruộng hôm nay khoảng ${money(view.market.pricePerKg)}/kg${view.market.glut ? ", đang gặt rộ nên thương lái ép giá" : ""}.`);
  lines.push(view.hiredWorkAvailable ? "Xóm trên cần người làm, ai rảnh ghé bảng gỗ." : "Hôm nay không ai thuê người làm.");
  for (const e of view.recentEvents) {
    const t = newsLine(e, view);
    if (t !== null) lines.push(t);
  }
  return lines;
}

export function lastVisitLine(view: Pick<PlayerView, "day" | "lastFieldVisitDay">): string {
  if (view.lastFieldVisitDay === null) return "Chưa ra đồng lần nào.";
  const since = view.day - view.lastFieldVisitDay;
  return since === 0 ? "Lần cuối ra đồng: hôm nay." : since === 1 ? "Lần cuối ra đồng: hôm qua." : `Lần cuối ra đồng: ${since} ngày trước.`;
}

/** What the player knows of a plot, from the last visit. The field alone needs no name ("Ruộng trống"). */
export function plotLine(plot: PlotView, plotCount = 1): { text: string; signs: boolean } {
  const line = (what: string) => (plotCount === 1 ? what[0]!.toUpperCase() + what.slice(1) : `${plotName(plot.id, plotCount)}: ${what}`);
  const k = plot.known;
  if (plot.status === "empty" || (k === null && plot.status !== "planted")) return { text: line("ruộng trống"), signs: false };
  if (plot.status === "harvested") return { text: line("đã gặt"), signs: false };
  if (k === null || k.stage === null) return { text: line("đã xuống giống, chưa thăm"), signs: false };
  const water = k.waterLevel ? `, nước ${WATER_WORDS[k.waterLevel]}` : "";
  const signs = Object.values(k.signs).some((s) => s !== null);
  return { text: line(`${STAGE[k.stage].toLowerCase()}${water}`), signs };
}

/** The loan with the nearest due day (late ones first). */
export function nearestLoan(loans: readonly Loan[]): Loan | undefined {
  return [...loans].sort((a, b) => (a.lateSinceDay === null ? 1 : 0) - (b.lateSinceDay === null ? 1 : 0) || a.dueDay - b.dueDay)[0];
}

export function moneyLine(view: PlayerView): string {
  const loan = nearestLoan(view.loans);
  const cash = `Tiền mặt ${money(view.cash)}.`;
  if (!loan) return `${cash} Không nợ ai.`;
  const when = loan.lateSinceDay !== null ? `đã quá hạn ${view.day - loan.dueDay} ngày` : loan.dueDay === view.day ? "hạn hôm nay" : `còn ${loan.dueDay - view.day} ngày`;
  return `${cash} Khoản gần hạn nhất: ${LOAN_KIND[loan.kind].toLowerCase()}, ${money(loan.balance)}, ${when}.`;
}

export function debtStageLine(view: Pick<PlayerView, "debtStage">): string | null {
  return view.debtStage >= 1 ? `Tình hình nợ: ${DEBT_STAGE[view.debtStage].toLowerCase()}.` : null;
}

export function yesterdayLine(view: Pick<PlayerView, "weather">): string | null {
  return view.weather.yesterday ? `Hôm qua: ${WEATHER_WORDS[view.weather.yesterday].toLowerCase()}.` : null;
}

/** "Dừng tua: …" line, from the skipStopped event of this morning. */
export function skipStopLine(view: Pick<PlayerView, "day" | "recentEvents">): string | null {
  const e = [...view.recentEvents].reverse().find((x) => x.kind === "skipStopped" && x.day === view.day);
  if (!e || e.kind !== "skipStopped") return null;
  const earned = e.earned > 0 ? ` (làm thuê được ${money(e.earned)})` : "";
  return `Dừng tua sau ${e.days} ngày: ${STOP_REASON[e.reason].toLowerCase()}${earned}.`;
}
