import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RunSummary } from "../../core/summary";
import { END_REASON, SummaryBook, summaryLines } from "../../ui/paper/SummaryBook";

const s: RunSummary = {
  seed: 42,
  endReason: "bankrupt",
  lastDay: 180,
  seasonsCompleted: 1,
  netWorth: -7_000_000,
  peakCash: 14_000_000,
  largestDebt: 9_000_000,
  uyTin: 31.6,
  nearBankruptcyCount: 2,
  maxDebtStage: 5,
  landAccess: true,
};

describe("summary card", () => {
  it("lists what spec §11 asks for, with the seed", () => {
    expect(summaryLines(s)).toEqual([
      ["Số vụ đã làm", "1"],
      ["Tài sản ròng cuối cùng", "-7.000.000 đ"],
      ["Cao điểm tiền mặt", "14.000.000 đ"],
      ["Món nợ lớn nhất", "9.000.000 đ"],
      ["Uy tín cuối", "32/100"],
      ["Số lần suýt phá sản", "2"],
      ["Nợ tệ nhất từng gặp", "Phá sản"],
      ["Seed", "42"],
    ]);
  });

  it("says why the run ended and offers replaying the same or a new seed", () => {
    const html = renderToString(<SummaryBook summary={s} onReplaySameSeed={() => {}} onNewSeed={() => {}} />).replaceAll("<!-- -->", "");
    expect(html).toContain(END_REASON.bankrupt);
    expect(html).toContain("Chơi lại cùng seed");
    expect(html).toContain("Chơi seed mới");
    expect(html).toMatch(/<span class="neg">-7.000.000 đ<\/span>/);
  });
});
