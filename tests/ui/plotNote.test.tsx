import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyAction } from "../../core/actions";
import { createInitialState } from "../../core/init";
import { getPlayerView } from "../../core/playerView";
import type { GameState } from "../../core/types";
import { plotNoteLines, PlotNote, shortVarietyName } from "../../ui/paper/PlotNote";
import { crop, data, stateWithCrops } from "../helpers";

function inField(s: GameState): GameState {
  const r = applyAction(s, { type: "chooseActivity", activity: "field" }, data);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

function render(s: GameState, plotId: number): string {
  return renderToString(<PlotNote view={getPlayerView(s, data)} data={data} plotId={plotId} onChoose={() => {}} />).replaceAll("<!-- -->", "");
}

describe("PlotNote", () => {
  it("an empty plot offers one 'Xuống giống…' entry (the variety choice is a sub-step)", () => {
    const html = render(inField(createInitialState(1, data)), 0);
    expect(html).toContain("Ruộng trống");
    expect(html).toContain("Xuống giống…");
    expect(html).not.toContain("Sạ Giống");
  });

  it("a crop: short variety, method, known stage and age, water and health words; signs from data", () => {
    const s = inField({ ...stateWithCrops({ 0: crop({ sowDay: 0, growth: 20, pests: { brown_planthopper: 0.5, rice_blast: 0 } }) }), day: 20 });
    const view = getPlayerView(s, data);
    const lines = plotNoteLines(view.plots[0]!, view, data);
    expect(lines.meta).toBe("Giống A sạ, đẻ nhánh (ngày 20). Nước vừa đủ, lúa tốt.");
    expect(lines.signs).toEqual([data.pests[0]!.signs.medium]);
    const html = render(s, 0);
    expect(html).toContain("Bón phân");
    expect(html).toContain("Phun thuốc trị rầy nâu");
    expect(html).toContain("Phun phòng…");
    expect(html).not.toContain("Phun phòng đạo ôn");
  });

  it("no signs: says so", () => {
    const s = inField({ ...stateWithCrops({ 0: crop({ sowDay: 0, growth: 20 }) }), day: 20 });
    expect(render(s, 0)).toContain("Không thấy dấu hiệu lạ.");
  });

  it("short variety name is the part before the dash", () => {
    expect(shortVarietyName("variety_b", data)).toBe("Giống B");
  });
});
