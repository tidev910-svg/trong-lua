import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Settlement } from "../../core/settlement";
import { LINE_MS, lineDelay, RESULT_EXTRA_MS, resultText, SettlementBook, settlementLines } from "../../ui/paper/SettlementBook";

const base: Settlement = {
  seasonKey: "DX-1",
  startDay: 2,
  endDay: 105,
  plots: [
    { plotId: 0, riceSales: 4_800_000, advanceSales: 0, shortfall: 0 },
    { plotId: 1, riceSales: 3_000_000, advanceSales: 1_000_000, shortfall: 200_000 },
  ],
  revenue: 8_600_000,
  supplies: 2_000_000,
  farmWork: 1_500_000,
  interest: 0,
  livingCost: 4_000_000,
  tetCost: 3_500_000,
  debtRepaid: 1_000_000,
  debtRemaining: 9_000_000,
  cashNow: 2_000_000,
  profit: -2_400_000,
  overlapsOtherSeason: false,
};

describe("settlement page", () => {
  it("revenue per plot, costs as negatives (zero lines left out), then debt and cash facts", () => {
    expect(settlementLines(base, 5).map((l) => [l.label, l.amount ?? l.text])).toEqual([
      ["Bán lúa thửa 1", 4_800_000],
      ["Bán lúa thửa 2", 3_000_000],
      ["Bán lúa non thửa 2", 1_000_000],
      ["Bù thiếu lúa non thửa 2", -200_000],
      ["Giống, phân, thuốc", -2_000_000],
      ["Làm đất, công cấy, nước, máy gặt", -1_500_000],
      ["Sinh hoạt phí trong vụ", -4_000_000],
      ["Tết", -3_500_000],
      ["Nợ đã trả trong vụ", "1.000.000 đ"],
      ["Còn nợ", "9.000.000 đ"],
      ["Tiền mặt cuối vụ", "2.000.000 đ"],
    ]);
  });

  it("the single field needs no plot number", () => {
    const one: Settlement = { ...base, plots: [{ plotId: 0, riceSales: 3_000_000, advanceSales: 1_000_000, shortfall: 200_000 }] };
    expect(settlementLines(one).slice(0, 3).map((l) => l.label)).toEqual(["Bán lúa", "Bán lúa non", "Bù thiếu lúa non"]);
  });

  it("result line: lời / lỗ; appears last after the extra pause", () => {
    expect(resultText(-2_400_000)).toBe("lỗ 2.400.000 đ");
    expect(resultText(461_140)).toBe("lời 461.140 đ");
    expect(lineDelay(0, 5)).toBe(0);
    expect(lineDelay(3, 5)).toBe(3 * LINE_MS);
    expect(lineDelay(4, 5)).toBe(4 * LINE_MS + RESULT_EXTRA_MS);
  });

  it("renders the title and a red loss", () => {
    const html = renderToString(<SettlementBook settlement={base} onClose={() => {}} />).replaceAll("<!-- -->", "");
    expect(html).toContain("Tính sổ vụ Đông Xuân");
    expect(html).toMatch(/<span class="neg">lỗ 2.400.000 đ<\/span>/);
    expect(html).toContain("Gấp sổ");
  });
});
