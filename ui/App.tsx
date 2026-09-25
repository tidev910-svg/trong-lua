import { useEffect, useState } from "react";
import { DebugPanel } from "./debug/DebugPanel";
import { dateLabel, DEBT_STAGE, money, seasonLabel } from "./format";
import { Briefing } from "./screens/Briefing";
import { Field } from "./screens/Field";
import { Finance } from "./screens/Finance";
import { Harvest } from "./screens/Harvest";
import { Settlement } from "./screens/Settlement";
import { Summary } from "./screens/Summary";
import { useGame, type Game } from "./useGame";

type Tab = "today" | "finance" | "sell";

function StatusBar({ game }: { game: Game }) {
  const v = game.view;
  const slot = v.phase.kind === "halfDay" ? (v.phase.slot === "morning" ? "Sáng" : "Chiều") : v.phase.kind === "briefing" ? "Sáng sớm" : "";
  return (
    <header className="status">
      <span>
        <b>{dateLabel(v)}</b> (ngày {v.day + 1}/365) · {slot} · vụ {seasonLabel(v.seasonKey)}
      </span>
      <span>Tiền: <b>{money(v.cash)}</b></span>
      <span>Sức lực: <b>{v.energy}</b></span>
      <span>Uy tín: <b>{Math.round(v.uyTin)}</b></span>
      <span className={v.debtStage >= 2 ? "bad" : v.debtStage === 1 ? "warn" : ""}>Nợ: {DEBT_STAGE[v.debtStage]}</span>
    </header>
  );
}

export function App() {
  const game = useGame();
  const [tab, setTab] = useState<Tab>("today");
  const [debug, setDebug] = useState(false);
  const { view } = game;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`") setDebug((d) => !d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let main;
  if (view.phase.kind === "gameOver") main = <Summary game={game} />;
  else if (view.phase.kind === "settlement") main = <Settlement key={view.phase.seasonKey} game={game} />;
  else if (tab === "finance") main = <Finance game={game} />;
  else if (tab === "sell") main = <Harvest game={game} />;
  else if (view.phase.kind === "halfDay" && view.phase.activity === "field") main = <Field game={game} />;
  else main = <Briefing game={game} />;

  const playing = view.phase.kind === "briefing" || view.phase.kind === "halfDay";
  return (
    <div className="app">
      <StatusBar game={game} />
      {playing && (
        <nav className="tabs">
          <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>Hôm nay</button>
          <button className={tab === "finance" ? "active" : ""} onClick={() => setTab("finance")}>Tài chính</button>
          <button className={tab === "sell" ? "active" : ""} onClick={() => setTab("sell")}>
            Bán lúa{view.lots.length > 0 ? ` (${view.lots.length})` : ""}
          </button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm("Bán hết lúa đang có và lên thành phố làm công nhân? Lượt chơi sẽ kết thúc.")) game.act({ type: "quit" });
            }}
          >
            Bán hết, lên thành phố
          </button>
        </nav>
      )}
      {game.message && <p className="message">{game.message}</p>}
      <main>{main}</main>
      {debug && <DebugPanel game={game} />}
      <footer className="muted">Phím ` mở bảng debug · Tự lưu cuối mỗi ngày</footer>
    </div>
  );
}
