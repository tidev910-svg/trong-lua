import type { WeatherState } from "../data/schemas";
import type { StopReason } from "../core/skip";
import type { SignLevel } from "../core/systems/pests";
import type { WaterLevel } from "../core/systems/water";
import type { CropStage, DebtStage, GameEvent, LoanKind } from "../core/types";
import type { PlayerView } from "../core/playerView";

export function money(vnd: number): string {
  // `|| 0` turns -0 into 0 so nothing shows as "-0 đ".
  return `${(Math.round(vnd) || 0).toLocaleString("vi-VN")} đ`;
}

/** Short form for tables: 3,2 tr. */
export function millions(vnd: number): string {
  return `${(vnd / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
}

export function kg(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")} kg`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const WEATHER: Record<WeatherState, string> = {
  sunny: "Nắng",
  cloudy: "Âm u",
  rain: "Mưa",
  heavy_rain: "Mưa lớn",
  storm: "Bão",
};

export const STAGE: Record<CropStage, string> = {
  germination: "Nảy mầm",
  tillering: "Đẻ nhánh",
  panicle: "Làm đòng",
  flowering: "Trổ bông",
  ripening: "Chín",
  harvestable: "Gặt được",
};

export const WATER: Record<WaterLevel, string> = { low: "Thiếu nước", ok: "Nước vừa", flooded: "Ngập" };

export const SIGN: Record<SignLevel, string> = { light: "nhẹ", medium: "vừa", heavy: "nặng" };

export const LOAN_KIND: Record<LoanKind, string> = {
  family: "Nợ họ hàng",
  rent: "Tiền thuê ruộng",
  store_credit: "Mua chịu đại lý",
  loan_shark: "Vay nóng",
  household_arrears: "Nợ sinh hoạt",
};

export const DEBT_STAGE: Record<DebtStage, string> = {
  0: "Bình thường",
  1: "Trễ hạn",
  2: "Cảnh báo – chủ nợ đến nhà",
  3: "Siết nợ",
  4: "Mất ruộng",
  5: "Phá sản",
};

export const STOP_REASON: Record<StopReason, string> = {
  storm: "Có bão",
  flood: "Lũ về",
  floodWarning: "Radio báo lũ",
  creditorVisit: "Chủ nợ đến nhà",
  foreclosure: "Bị siết nợ",
  landLost: "Mất ruộng",
  rentDue: "Tới hạn tiền thuê",
  tet: "Tết",
  harvestable: "Lúa dự kiến chín",
  severeForecast: "Dự báo mưa lớn/bão",
  pestAlert: "Radio cảnh báo dịch",
  stageChange: "Lúa dự kiến sang giai đoạn mới",
  debtDueSoon: "Sắp tới hạn nợ",
  maxDays: "Đủ số ngày",
  phaseChange: "Có việc cần xem",
};

export function dateLabel(view: Pick<PlayerView, "date">): string {
  return `${view.date.dayOfMonth}/${view.date.month}`;
}

/** Date of any game day, from the current view's date and day (no leap years). */
export function dayLabel(view: Pick<PlayerView, "date" | "day">, day: number): string {
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let month = view.date.month;
  let dom = view.date.dayOfMonth + (day - view.day);
  while (dom > (lengths[month - 1] ?? 31)) {
    dom -= lengths[month - 1] ?? 31;
    month = month === 12 ? 1 : month + 1;
  }
  while (dom < 1) {
    month = month === 1 ? 12 : month - 1;
    dom += lengths[month - 1] ?? 31;
  }
  return `${dom}/${month}`;
}

export function seasonLabel(seasonKey: string): string {
  const [season, n] = seasonKey.split("-");
  const name = season === "DX" ? "Đông Xuân" : season === "HT" ? "Hè Thu" : "Thu Đông";
  return n === "1" ? name : `${name} (${n})`;
}

export function varietyName(varietyId: string, varieties: readonly { id: string; name: string }[]): string {
  return varieties.find((v) => v.id === varietyId)?.name ?? varietyId;
}

/** One line of news for the briefing, or null for events not worth a line. */
export function eventText(e: GameEvent): string | null {
  switch (e.kind) {
    case "floodWarning":
      return `📻 Radio: nước lũ dự kiến về khoảng ngày ${e.predictedDay}.`;
    case "flood":
      return "🌊 Lũ về! Ruộng chưa gặt bị ngập.";
    case "lotSold":
      return e.auto ? `Lúa để quá lâu, thương lái mua rẻ: ${money(e.amount)}.` : null;
    case "loanLate":
      return `⚠ ${LOAN_KIND[e.loanKind]} đã quá hạn.`;
    case "tet":
      return `🧧 Tết: chi thêm ${money(e.amount)}.`;
    case "creditorVisit":
      return `🚪 Chủ nợ (${LOAN_KIND[e.loanKind]}) đến nhà. Hạn chót: ngày ${e.finalDeadlineDay}.`;
    case "foreclosure":
      return `⛓ Bị siết nợ: bán ép ${e.lotsSold} lô lúa, bán non ép ${e.plotsSoldAdvance} thửa (${money(e.amount)}).`;
    case "landLost":
      return "❌ Chủ đất lấy lại ruộng. Chỉ còn làm thuê hoặc nghỉ.";
    case "landReRented":
      return `Đã thuê lại ruộng (${money(e.amount)}).`;
    case "bankrupt":
      return "Phá sản.";
    default:
      return null;
  }
}
