import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getActionOptions, quoteOption } from "../../core/actionOptions";
import { createInitialState } from "../../core/init";
import { getPlayerView } from "../../core/playerView";
import type { GameState, Loan } from "../../core/types";
import { dueText, LedgerBook, ledgerDoneText, quoteText } from "../../ui/paper/LedgerBook";
import { crop, data, stateWithCrops } from "../helpers";

const loan = (over: Partial<Loan>): Loan => ({
  id: "x-1",
  kind: "loan_shark",
  principal: 1,
  balance: 1,
  takenDay: 0,
  dueDay: 30,
  lateSinceDay: null,
  warningDay: null,
  finalDeadlineDay: null,
  ...over,
});

describe("ledger wording", () => {
  const view = getPlayerView(createInitialState(1, data), data);

  it("due lines: days left, due today, late with the final deadline, store credit until the next sale", () => {
    expect(dueText(loan({ dueDay: 30 }), view)).toBe("Hạn 15/12 (còn 30 ngày)");
    expect(dueText(loan({ dueDay: 0 }), view)).toBe("Hạn hôm nay");
    expect(dueText(loan({ kind: "store_credit", dueDay: 364 }), view)).toBe("Trả khi bán lúa");
    const late = getPlayerView({ ...createInitialState(1, data), day: 40 }, data);
    expect(dueText(loan({ dueDay: 30, lateSinceDay: 31, finalDeadlineDay: 52 }), late)).toBe("Quá hạn 10 ngày, hạn chót 6/1");
  });

  it("quotes for the chosen amount come from core", () => {
    const s = stateWithCrops({ 1: crop({ sowDay: 2 }) });
    const v = getPlayerView(s, data);
    const opts = getActionOptions(v, { kind: "ledger" });
    const shark = opts.find((o) => o.id === "loanShark")!;
    expect(quoteText(shark, quoteOption(v, shark, 2_000_000, data), v)).toBe("Nhận ngay 2.000.000 đ, phải trả 2.200.000 đ trước ngày 15/12.");
    const advance = opts.find((o) => o.id === "advance:1")!;
    expect(quoteText(advance, quoteOption(v, advance, 50, data), v)).toMatch(/^Bán trước [\d.]+ kg, nhận ngay [\d.]+ đ\./);
  });

  it("confirmation lines", () => {
    expect(ledgerDoneText({ type: "repay", loanId: "a", amount: 500_000 }, 0, 0)).toBe("Đã trả 500.000 đ.");
    expect(ledgerDoneText({ type: "sellAdvance", plotId: 0, ratio: 0.5 }, 100, 2_100)).toBe("Bán lúa non: nhận 2.000 đ.");
    expect(ledgerDoneText({ type: "quit" }, 0, 0)).toBeNull();
  });

  it("renders every debt with its actions, borrowing options and quitting", () => {
    const s: GameState = stateWithCrops({ 1: crop({ sowDay: 2 }) });
    const html = renderToString(<LedgerBook view={getPlayerView(s, data)} data={data} onChoose={() => {}} onClose={() => {}} />).replaceAll("<!-- -->", "");
    expect(html).toContain("Sổ tiền nợ");
    expect(html).toContain("Nợ họ hàng");
    expect(html).toContain("Tiền thuê ruộng");
    expect(html).toContain("Vay nóng");
    expect(html).toContain("Bán lúa non thửa 2");
    expect(html).toContain("Xin gia hạn tiền thuê");
    expect(html).toContain("Bán hết, lên thành phố");
    expect(html).not.toContain("Thuê lại ruộng");
  });
});
