import { useMemo, useRef, useState } from "react";
import { getActionOptions, type OptionTarget } from "../../core/actionOptions";
import { plotName } from "../../core/names";
import { getPlayerView } from "../../core/playerView";
import { dispatch, newSession, type Session } from "../../core/save";
import { loadData } from "../../data/loadData";
import { average } from "../../sim/bots/average";
import { runGame } from "../../sim/runGame";
import { STAGE } from "../format";
import { Calendar } from "../hud/Calendar";
import { HoverTag } from "../hud/HoverTag";
import { visualPhase } from "../hud/labels";
import { PhaseStrip } from "../hud/PhaseStrip";
import { Purse } from "../hud/Purse";
import { Rain } from "../hud/Rain";
import { Toast } from "../hud/Toast";
import { TimeOfDay } from "../scene/TimeOfDay";
import { ActionButton } from "../paper/ActionButton";
import { Notebook } from "../paper/Notebook";
import { PinnedNote, type Box } from "../paper/PinnedNote";
import { Scene, World } from "../scene/Scene";
import "../theme.css";

/**
 * Dev-only page (?preview=scene[&day=N][&field]) showing the static scene (M2.2) on a real game:
 * the average bot's run, seed 5, stopped at day N (and at a field visit with &field). Not part of the game.
 */
const data = loadData();

function sessionAt(day: number, field: boolean): Session {
  const { session: full } = runGame(5, average, data);
  let s = newSession(5, data);
  for (const action of full.save.actions) {
    const inField = s.state.phase.kind === "halfDay" && s.state.phase.activity === "field";
    if (s.state.day >= day && (!field || inField)) break;
    s = dispatch(s, action, data).session;
  }
  return s;
}

export function ScenePreview() {
  const params = new URLSearchParams(window.location.search);
  const day = Number(params.get("day") ?? 40);
  const field = params.has("field");
  const view = useMemo(() => getPlayerView(sessionAt(day, field).state, data), [day, field]);
  const gameRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<{ target: OptionTarget; title: string; anchor: Box; index: number } | null>(null);
  const [book, setBook] = useState<{ target: OptionTarget; title: string } | null>(null);
  const [hover, setHover] = useState<{ label: string | null; x: number; y: number }>({ label: null, x: 0, y: 0 });
  const phase = visualPhase(view, params.has("begun"), params.has("night"));
  const onHover = (label: string | null, cx?: number, cy?: number) => {
    const g = gameRef.current?.getBoundingClientRect();
    setHover((h) => ({ label, x: cx !== undefined && g ? cx - g.left : h.x, y: cy !== undefined && g ? cy - g.top : h.y }));
  };

  const openPlot = (plotId: number) => {
    const game = gameRef.current;
    const el = game?.querySelector(`[data-plot="${plotId}"]`);
    if (!game || !el) return;
    const g = game.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setNote({ target: { kind: "plot", plotId }, title: plotName(plotId, view.plots.length), anchor: { left: r.left - g.left, top: r.top - g.top, right: r.right - g.left, bottom: r.bottom - g.top }, index: plotId });
  };
  const plot = note?.target.kind === "plot" ? view.plots[note.target.plotId] : undefined;

  return (
    <div className="game" ref={gameRef}>
      <World>
        <Scene
          view={view}
          onPlot={openPlot}
          onHouse={() => setBook({ target: { kind: "house" }, title: "Nhà" })}
          onSign={() => setBook({ target: { kind: "workSign" }, title: "Bảng gỗ" })}
          onLedger={() => setBook({ target: { kind: "ledger" }, title: "Sổ tiền nợ" })}
          onTrader={() => setBook({ target: { kind: "trader" }, title: "Thương lái" })}
          onHover={onHover}
          overlay={<TimeOfDay phase={phase} />}
        />
      </World>
      <Rain weather={view.weather.forecast[0]?.predicted} />
      <Calendar month={view.date.month} dayOfMonth={view.date.dayOfMonth} seasonKey={view.seasonKey} daysToTet={view.daysToTet} flipKey={0} />
      <Purse cash={view.cash} energy={view.energy} energyMax={view.energyMax} uyTin={view.uyTin} forecastToday={view.weather.forecast[0]} />
      <PhaseStrip phase={phase} lead="Sáng sớm." text="Đọc bản tin trước khi bắt đầu ngày.">
        <button className="btn">Mở bản tin</button>
      </PhaseStrip>
      <HoverTag {...hover} />
      <Toast message={params.get("toast")} id={1} />
      {note && plot && (
        <PinnedNote title={note.title} anchor={note.anchor} container={{ width: gameRef.current?.clientWidth ?? 1200, height: gameRef.current?.clientHeight ?? 720 }} index={note.index} onClose={() => setNote(null)}>
          <div className="meta">
            {plot.known?.stage ? STAGE[plot.known.stage] : "Ruộng trống"}
            {plot.staleDays !== null ? `, thấy ${plot.staleDays} ngày trước` : ""}
          </div>
          <div className="acts">
            {getActionOptions(view, note.target).map((o) => (
              <ActionButton key={o.id} option={o} onChoose={() => setNote(null)} />
            ))}
          </div>
        </PinnedNote>
      )}
      {book && (
        <Notebook title={book.title} onClose={() => setBook(null)}>
          <div className="acts">
            {getActionOptions(view, book.target).map((o) => (
              <ActionButton key={o.id} option={o} onChoose={() => setBook(null)} />
            ))}
          </div>
        </Notebook>
      )}
    </div>
  );
}
