import type { ReactElement } from "react";
import { renderToString as renderRaw } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getPlayerView } from "../../core/playerView";
import { dispatch, newSession, type Session } from "../../core/save";
import type { GameState } from "../../core/types";
import { BOTS } from "../../sim/bots";
import { runGame } from "../../sim/runGame";
import { DebugPanel } from "../../ui/debug/DebugPanel";
import { Briefing } from "../../ui/screens/Briefing";
import { Field } from "../../ui/screens/Field";
import { Finance } from "../../ui/screens/Finance";
import { Harvest } from "../../ui/screens/Harvest";
import { Settlement } from "../../ui/screens/Settlement";
import { Sowing } from "../../ui/screens/Sowing";
import { Summary } from "../../ui/screens/Summary";
import type { Game } from "../../ui/useGame";
import { crop, data, stateWithCrops } from "../helpers";

/** Server render without React's text-separator comments, so plain text can be matched. */
function renderToString(element: ReactElement): string {
  return renderRaw(element).replaceAll("<!-- -->", "");
}

function gameFor(state: GameState): Game {
  const session: Session = { state, save: { version: state.version, seed: state.seed, actions: [] } };
  return { data, session, view: getPlayerView(state, data), message: null, act: () => true, perform: () => ({ ok: false, reason: "test" }), newGame: () => {}, importSave: () => null };
}

describe("screens render without crashing (smoke test, server-side)", () => {
  it("briefing on day 0", () => {
    const html = renderToString(<Briefing game={gameFor(newSession(1, data).state)} />);
    expect(html).toContain("Bản tin buổi sáng");
    expect(html).toContain("Ra đồng");
  });

  it("field with a visited crop, and the sowing dialog", () => {
    const base = stateWithCrops({ 0: crop({ growth: 10, pests: { brown_planthopper: 0.5, rice_blast: 0 } }) });
    const out = dispatch({ state: base, save: { version: 1, seed: 1, actions: [] } }, { type: "chooseActivity", activity: "field" }, data);
    if (!out.result.ok) throw new Error(out.result.reason);
    const game = gameFor(out.session.state);
    const html = renderToString(<Field game={game} />);
    expect(html).toContain("Ngoài đồng");
    expect(html).toContain("Đẻ nhánh");
    expect(html).toContain("Rầy nâu");
    expect(renderToString(<Sowing game={game} plotId={1} onClose={() => {}} />)).toContain("Xuống giống thửa 2");
  });

  it("finance and selling with loans, contracts and lots", () => {
    const s: GameState = {
      ...stateWithCrops({ 2: crop({ sowDay: 0 }) }),
      harvestLots: [{ id: "lot-1", plotId: 0, varietyId: "variety_a", seasonKey: "DX-1", kg: 700, harvestDay: 0, nightsWaited: 1 }],
    };
    expect(renderToString(<Finance game={gameFor(s)} />)).toContain("Vay nóng");
    expect(renderToString(<Harvest game={gameFor(s)} />)).toContain("Thửa 1");
  });

  it("settlement, summary and debug panel from a real bot game", () => {
    const { session } = runGame(4, BOTS.average!, data);
    expect(renderToString(<Summary game={gameFor(session.state)} />)).toContain("Tài sản ròng");
    expect(renderToString(<DebugPanel game={gameFor(session.state)} />)).toContain("Seed 4");
    // Find a settlement screen along the way
    let s = newSession(4, data);
    let settlementHtml = "";
    for (const action of session.save.actions) {
      s = dispatch(s, action, data).session;
      if (s.state.phase.kind === "settlement") {
        settlementHtml = renderToString(<Settlement game={gameFor(s.state)} />);
        break;
      }
    }
    if (settlementHtml) expect(settlementHtml).toContain("Tính sổ vụ");
  });
});
