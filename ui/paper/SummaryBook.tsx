import type { RunSummary } from "../../core/summary";
import { DEBT_STAGE, money } from "../format";
import { Notebook } from "./Notebook";

export const END_REASON: Record<RunSummary["endReason"], string> = {
  yearEnd: "Hết một năm làm ruộng thuê.",
  bankrupt: "Phá sản: nợ nhiều hơn của cải, không còn ai cho vay.",
  quit: "Bán hết, lên thành phố làm công nhân.",
  inProgress: "Chưa kết thúc.",
};

/** The summary card's lines (spec §11), from core/summary.ts. */
export function summaryLines(s: RunSummary): [string, string][] {
  return [
    ["Số vụ đã làm", String(s.seasonsCompleted)],
    ["Tài sản ròng cuối cùng", money(s.netWorth)],
    ["Cao điểm tiền mặt", money(s.peakCash)],
    ["Món nợ lớn nhất", money(s.largestDebt)],
    ["Uy tín cuối", `${Math.round(s.uyTin)}/100`],
    ["Số lần suýt phá sản", String(s.nearBankruptcyCount)],
    ["Nợ tệ nhất từng gặp", DEBT_STAGE[s.maxDebtStage as keyof typeof DEBT_STAGE] ?? String(s.maxDebtStage)],
    ["Seed", String(s.seed)],
  ];
}

interface Props {
  summary: RunSummary;
  onReplaySameSeed: () => void;
  onNewSeed: () => void;
}

/** "Thẻ tổng kết" (spec §11): why the run ended, the numbers, and playing again. */
export function SummaryBook({ summary, onReplaySameSeed, onNewSeed }: Props) {
  return (
    <Notebook title="Tổng kết">
      <p className={summary.endReason === "bankrupt" ? "neg" : ""}>{END_REASON[summary.endReason]}</p>
      <h4>Một năm nhìn lại</h4>
      {summaryLines(summary).map(([label, value]) => (
        <div key={label} className="ledger-line">
          <span>{label}</span>
          <span className={label.startsWith("Tài sản ròng") ? (summary.netWorth < 0 ? "neg" : "pos") : ""}>{value}</span>
        </div>
      ))}
      <div className="row">
        <button type="button" className="btn" onClick={onReplaySameSeed}>
          Chơi lại cùng seed
        </button>
        <button type="button" className="btn ghost" onClick={onNewSeed}>
          Chơi seed mới
        </button>
      </div>
    </Notebook>
  );
}
