import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getPlayerView, type PlayerView, type PlotView } from "../../core/playerView";
import { dispatch, newSession } from "../../core/save";
import type { GameState } from "../../core/types";
import { isActivationKey } from "../../ui/scene/Interactive";
import { drawnStage, hasSigns, isStale, markPositions, plotLabel, stakeLabel, waterOpacity } from "../../ui/scene/Plot";
import { initialScrollLeft, isInField, Scene } from "../../ui/scene/Scene";
import { crop, data, stateWithCrops } from "../helpers";

const noop = () => {};
const handlers = { onPlot: noop, onHouse: noop, onSign: noop, onLedger: noop, onTrader: noop };

function render(view: PlayerView): string {
  return renderToString(<Scene view={view} {...handlers} />).replaceAll("<!-- -->", "");
}

/** A state where plot 0 has a crop the player visited on `visitDay`, looked at on `day`. */
function visited(visitDay: number, day: number, pests = { brown_planthopper: 0, rice_blast: 0 }): GameState {
  const s = { ...stateWithCrops({ 0: crop({ sowDay: 0, growth: 20, pests }) }), day: visitDay };
  const field = dispatch({ state: s, save: { version: 1, seed: 1, actions: [] } }, { type: "chooseActivity", activity: "field" }, data).session.state;
  return { ...field, day, phase: { kind: "briefing" } };
}

const plotOf = (s: GameState, id = 0): PlotView => getPlayerView(s, data).plots[id]!;

describe("plots are drawn from what the player knows", () => {
  it("never seen = empty; seen = the stage seen then, even if the crop grew since", () => {
    expect(drawnStage(plotOf(newSession(1, data).state))).toBe("empty");
    const s = visited(20, 30);
    expect(drawnStage(plotOf(s))).toBe("tillering");
    const grown: GameState = { ...s, plots: s.plots.map((p) => (p.id === 0 && p.crop ? { ...p, crop: { ...p.crop, growth: 70 } } : p)) };
    expect(drawnStage(plotOf(grown))).toBe("tillering");
  });

  it("old knowledge (≥ 2 days) is faded and dated, except while in the field", () => {
    expect(isStale(plotOf(visited(20, 21)), false)).toBe(false);
    const old = plotOf(visited(20, 25));
    expect(isStale(old, false)).toBe(true);
    expect(isStale(old, true)).toBe(false);
    expect(stakeLabel(old, false, true)).toBe("Ruộng, thấy 5 ngày trước");
    expect(stakeLabel(old, true, true)).toBe("Ruộng");
    expect(stakeLabel(old, false, false)).toBe("Ruộng: đã trả ruộng");
    expect(stakeLabel(old, false, true, 5)).toBe("Thửa 1, thấy 5 ngày trước");
  });

  it("red mark only when signs were seen; label says what a click does", () => {
    expect(hasSigns(plotOf(visited(20, 21)))).toBe(false);
    const sick = plotOf(visited(20, 21, { brown_planthopper: 0.5, rice_blast: 0 }));
    expect(hasSigns(sick)).toBe(true);
    // Sown day 0, expected harvestable day 99, today day 21 → 21 %, 78 days left (public schedule).
    expect(plotLabel(sick, false, true)).toBe("Ruộng (đẻ nhánh; dự kiến chín 21% · còn 78 ngày): ra đồng");
    expect(plotLabel(sick, true, true)).toBe("Ruộng (đẻ nhánh; dự kiến chín 21% · còn 78 ngày): xem và làm việc");
    expect(plotLabel(sick, true, true, 5)).toBe("Thửa 1 (đẻ nhánh; dự kiến chín 21% · còn 78 ngày): xem và làm việc");
  });

  it("water shows less as the rice covers the field", () => {
    expect(waterOpacity("empty")).toBeGreaterThan(waterOpacity("tillering"));
    expect(waterOpacity("tillering")).toBeGreaterThan(waterOpacity("ripening"));
  });
});

describe("Scene", () => {
  it("renders every object as a keyboard button with its label, and the rice patterns", () => {
    const html = render(getPlayerView(newSession(1, data).state, data));
    for (const label of ["Nhà: nghỉ ngơi", "Sổ: tiền và nợ", "Bảng gỗ: đi làm thuê"]) expect(html).toContain(`aria-label="${label}"`);
    expect(html.match(/aria-label="Ruộng \(/g)).toHaveLength(1); // one field of 5 công
    expect(html.match(/role="button" tabindex="0"/g)?.length).toBe(4);
    for (const stage of ["empty", "germination", "tillering", "panicle", "flowering", "ripening", "harvestable"]) expect(html).toContain(`id="p-${stage}"`);
  });

  it("ripeness tag while rice is in the field, from the public schedule; none on empty land or after losing it", () => {
    expect(render(getPlayerView(newSession(1, data).state, data))).not.toContain("data-ripeness");
    const s = visited(20, 40);
    const html = render(getPlayerView(s, data)).replaceAll("<!-- -->", "");
    expect(html).toContain('data-ripeness="40"');
    expect(html).toContain("Dự kiến chín 40% · còn 59 ngày");
    expect(render(getPlayerView({ ...s, day: 120 }, data))).toContain("Đến kỳ gặt theo lịch");
    expect(render(getPlayerView({ ...s, landAccess: false }, data))).not.toContain("data-ripeness");
  });

  it("the work sign follows today's hired work", () => {
    const s = newSession(1, data).state;
    expect(render(getPlayerView({ ...s, hiredWorkAvailable: true }, data))).toContain("Cần người làm");
    expect(render(getPlayerView({ ...s, hiredWorkAvailable: false }, data))).toContain("Hôm nay nghỉ");
  });

  it("the trader's boat is clickable only while rice waits to be sold", () => {
    const s = newSession(1, data).state;
    expect(render(getPlayerView(s, data))).not.toContain("Thương lái");
    const withLot: GameState = { ...s, harvestLots: [{ id: "lot-1", plotId: 0, varietyId: "variety_a", seasonKey: "DX-1", kg: 700, harvestDay: 0, nightsWaited: 0 }] };
    expect(render(getPlayerView(withLot, data))).toContain('aria-label="Thương lái: bán lúa"');
  });

  it("in the field the plots are current; at home old ones are dated", () => {
    const s = visited(20, 25);
    expect(isInField(getPlayerView(s, data))).toBe(false);
    expect(render(getPlayerView(s, data))).toContain("thấy 5 ngày trước");
  });
});

describe("interaction helpers", () => {
  it("Enter and Space press a scene object", () => {
    expect(isActivationKey("Enter")).toBe(true);
    expect(isActivationKey(" ")).toBe(true);
    expect(isActivationKey("a")).toBe(false);
  });

  it("phones start scrolled onto the fields; wide screens do not scroll", () => {
    expect(initialScrollLeft(1200, 1400)).toBe(0);
    // 800px tall phone: scene 1333px wide, viewport 390 → centre x=700 → 1333·700/1200 − 195
    expect(initialScrollLeft(1333, 390)).toBe(Math.round((1333 * 700) / 1200 - 195));
    expect(initialScrollLeft(1333, 1300)).toBe(33);
  });
});

describe("marks on the field", () => {
  it("gather around the middle of the wide field (what a phone shows first); corners on small plots", () => {
    const field = markPositions({ x: 370, y: 170, width: 750, height: 290 }, 60);
    expect(field).toEqual({ stakeX: 721, tagX: 630, tagWidth: 230, signX: 606 });
    expect(markPositions({ x: 370, y: 170, width: 240, height: 170 }, 60)).toEqual({ stakeX: 388, tagX: 386, tagWidth: 180, signX: 584 });
  });
});
