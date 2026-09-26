import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getPlayerView } from "../../core/playerView";
import type { Session } from "../../core/save";
import { BOTS } from "../../sim/bots";
import { runGame } from "../../sim/runGame";
import { App } from "../../ui/App";
import { DebugPanel } from "../../ui/debug/DebugPanel";
import type { Game } from "../../ui/useGame";
import { data } from "../helpers";

describe("App (smoke test, server-side)", () => {
  it("renders the scene, the HUD and the morning briefing of a new game", () => {
    const html = renderToString(<App />).replaceAll("<!-- -->", "");
    expect(html).toContain('aria-label="Khung cảnh ruộng lúa"');
    expect(html).toContain('class="hud calendar"');
    expect(html).toContain("Tiền mặt");
    expect(html).toContain("Sáng ngày 15 tháng 11");
    expect(html).toContain("Bắt đầu ngày");
    expect(html).not.toMatch(/class="tabs"|<nav/);
  });

  it("the debug panel still renders a finished game", () => {
    const { session } = runGame(4, BOTS.average!, data);
    const s: Session = session;
    const game: Game = { data, session: s, view: getPlayerView(s.state, data), message: null, act: () => true, perform: () => ({ ok: false, reason: "test" }), newGame: () => {}, importSave: () => null };
    expect(renderToString(<DebugPanel game={game} />)).toContain("Seed");
  });
});
