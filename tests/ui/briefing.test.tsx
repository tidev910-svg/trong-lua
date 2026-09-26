import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyAction } from "../../core/actions";
import { createInitialState } from "../../core/init";
import { getPlayerView } from "../../core/playerView";
import type { GameState } from "../../core/types";
import { Briefing } from "../../ui/paper/Briefing";
import { briefingTitle, lastVisitLine, moneyLine, newsLine, plotLine, radioLines, skipStopLine, yesterdayLine } from "../../ui/paper/briefingText";
import { crop, data, stateWithCrops } from "../helpers";

function act(state: GameState, ...actions: Parameters<typeof applyAction>[1][]): GameState {
  let s = state;
  for (const a of actions) {
    const r = applyAction(s, a, data);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
  }
  return s;
}

describe("briefing wording", () => {
  it("title without weekday; yesterday only after the first night", () => {
    const s = createInitialState(1, data);
    const v = getPlayerView(s, data);
    expect(briefingTitle(v)).toBe("Sáng ngày 15 tháng 11");
    expect(yesterdayLine(v)).toBeNull();
    const next = act(s, { type: "chooseActivity", activity: "rest" }, { type: "chooseActivity", activity: "rest" });
    expect(yesterdayLine(getPlayerView(next, data))).toMatch(/^Hôm qua: /);
  });

  it("radio: price, hired work, alerts with the pest name, overnight news without emoji", () => {
    const s: GameState = { ...createInitialState(1, data), regionalAlerts: [{ pestId: "rice_blast", startDay: 0, endDay: 13 }], hiredWorkAvailable: false };
    const lines = radioLines(getPlayerView(s, data), data);
    expect(lines[0]).toContain("đạo ôn");
    expect(lines.some((l) => l.startsWith("Giá lúa tươi"))).toBe(true);
    expect(lines).toContain("Hôm nay không ai thuê người làm.");
    const v = getPlayerView(s, data);
    expect(newsLine({ day: 0, kind: "tet", amount: 3_500_000 }, v)).toBe("Tết đến: chi thêm 3.500.000 đ.");
    expect(lines.join("")).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("fields as last seen, with signs; last visit line", () => {
    let s = { ...stateWithCrops({ 0: crop({ sowDay: 0, growth: 20, pests: { brown_planthopper: 0.5, rice_blast: 0 } }) }), day: 20 };
    expect(lastVisitLine(getPlayerView(s, data))).toBe("Chưa ra đồng lần nào.");
    s = act(s, { type: "chooseActivity", activity: "field" });
    s = { ...s, day: 23, phase: { kind: "briefing" } };
    const v = getPlayerView(s, data);
    expect(lastVisitLine(v)).toBe("Lần cuối ra đồng: 3 ngày trước.");
    expect(plotLine(v.plots[0]!)).toEqual({ text: "Thửa 1: đẻ nhánh, nước vừa đủ", signs: true });
    expect(plotLine(v.plots[1]!)).toEqual({ text: "Thửa 2: ruộng trống", signs: false });
  });

  it("money: cash and the nearest due loan", () => {
    const v = getPlayerView(createInitialState(1, data), data);
    expect(moneyLine(v)).toBe("Tiền mặt 3.000.000 đ. Khoản gần hạn nhất: tiền thuê ruộng, 5.000.000 đ, còn 150 ngày.");
  });

  it("the skip stop line comes from skipStopped, with the wage earned", () => {
    const s = act({ ...createInitialState(13, data), day: 20 }, { type: "skipUntil", defaultActivity: "hired_work", stopOn: [], maxDays: 4 });
    expect(skipStopLine(getPlayerView(s, data))).toMatch(/^Dừng tua sau 4 ngày: đủ số ngày( \(làm thuê được [\d.]+ đ\))?\.$/);
  });

  it("renders as a notebook with start and skip buttons", () => {
    const view = getPlayerView(createInitialState(1, data), data);
    const html = renderToString(<Briefing view={view} data={data} canSkip onStartDay={() => {}} onSkip={() => {}} />).replaceAll("<!-- -->", "");
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Bắt đầu ngày");
    expect(html).toContain("Tua đến khi…");
    expect(html).toContain("Hôm nay: ");
  });
});
