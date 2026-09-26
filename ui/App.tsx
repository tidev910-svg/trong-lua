import { useCallback, useEffect, useRef, useState } from "react";
import { getActionOptions, type ActionOption, type OptionTarget } from "../core/actionOptions";
import type { PlayerView } from "../core/playerView";
import type { Action, GameEvent } from "../core/types";
import { DebugPanel } from "./debug/DebugPanel";
import { money } from "./format";
import { Calendar } from "./hud/Calendar";
import { HoverTag } from "./hud/HoverTag";
import { visualPhase, type VisualPhase } from "./hud/labels";
import { PhaseStrip } from "./hud/PhaseStrip";
import { Purse } from "./hud/Purse";
import { Rain } from "./hud/Rain";
import { Toast } from "./hud/Toast";
import { pause } from "./motion";
import { Briefing } from "./paper/Briefing";
import { PinnedNote, type Box } from "./paper/PinnedNote";
import { PlotNote } from "./paper/PlotNote";
import { FARMER_AT_SIGN, FARMER_HOME, plotStandPoint, type Point } from "./scene/layout";
import { hasSigns } from "./scene/Plot";
import { isInField, Scene, World } from "./scene/Scene";
import { TimeOfDay } from "./scene/TimeOfDay";
import { useGame } from "./useGame";

/** Which notebook is open (UI state, not game state). Settlement and the summary open from the game phase. */
type Book = "briefing" | "skip" | "ledger" | "trader";

interface CalendarPage {
  month: number;
  dayOfMonth: number;
  seasonKey: string;
  daysToTet: number | null;
}

function pageOf(view: PlayerView): CalendarPage {
  return { month: view.date.month, dayOfMonth: view.date.dayOfMonth, seasonKey: view.seasonKey, daysToTet: view.daysToTet };
}

/** Same phase and half-day activity (nothing to animate between the two views). */
function samePhase(a: PlayerView, b: PlayerView): boolean {
  return JSON.stringify(a.phase) === JSON.stringify(b.phase);
}

/** Strip guidance for the drawn phase. */
function stripText(view: PlayerView, phase: VisualPhase): { lead: string; text: string } {
  if (phase === "night") return { lead: "Trời tối.", text: "Cả nhà ăn cơm, đi ngủ sớm." };
  if (phase === "briefing") return { lead: "Sáng sớm.", text: "Đọc bản tin trước khi bắt đầu ngày." };
  const half = phase === "afternoon" ? "Buổi chiều" : "Buổi sáng";
  if (isInField(view)) return { lead: `${half}, ngoài đồng.`, text: "Bấm vào từng thửa để xem kỹ và làm việc." };
  if (!view.landAccess) return { lead: `${half}.`, text: "Đã mất ruộng: chỉ còn làm thuê hoặc nghỉ. Thuê lại ruộng ở quyển sổ." };
  return { lead: `${half}.`, text: "Chọn việc: bấm vào ruộng để ra đồng, bảng gỗ để đi làm thuê, hoặc về nhà nghỉ." };
}

/**
 * The in-world game (UI_DIRECTION): scene + HUD + paper. Every change goes through `perform` (core dispatch);
 * the animations then play from the events the action produced, while the state has already changed.
 */
export function App() {
  const game = useGame();
  const { view, data } = game;
  const gameRef = useRef<HTMLDivElement>(null);

  const [dayBegun, setDayBegun] = useState(false);
  const [book, setBook] = useState<Book | null>(() => (view.phase.kind === "briefing" ? "briefing" : null));
  const [farmerAt, setFarmerAt] = useState<Point>(FARMER_HOME);
  const [night, setNight] = useState(false);
  const [page, setPage] = useState<CalendarPage | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  const [toast, setToast] = useState<{ message: string | null; id: number }>({ message: null, id: 0 });
  const [hover, setHover] = useState<{ label: string | null; x: number; y: number }>({ label: null, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [debug, setDebug] = useState(false);
  const [note, setNote] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ box: Box; size: { width: number; height: number } } | null>(null);

  /** Pins the note beside plot `plotId` (in game-box coordinates). */
  const openNote = useCallback((plotId: number) => {
    const game = gameRef.current;
    const el = game?.querySelector(`[data-plot="${plotId}"]`);
    if (!game || !el) return;
    const g = game.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setAnchor({ box: { left: r.left - g.left, top: r.top - g.top, right: r.right - g.left, bottom: r.bottom - g.top }, size: { width: g.width, height: g.height } });
    setNote(plotId);
  }, []);

  const say = useCallback((message: string) => setToast((t) => ({ message, id: t.id + 1 })), []);
  const flip = useCallback(() => setFlipKey((k) => k + 1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`") setDebug((d) => !d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Plays the animations for what an action did. The game state is already updated. */
  const play = useCallback(
    async (events: GameEvent[], before: PlayerView, after: PlayerView, plotId: number | null = null) => {
      // Field work (fertilize, spray…) changes nothing to animate: the note just shows the new state.
      if (events.length === 0 && samePhase(before, after)) return;
      setBusy(true);
      setPage(pageOf(before));
      let newDay = false;
      const lines: string[] = [];
      for (const e of events) {
        switch (e.kind) {
          case "hiredWorkDone":
            setFarmerAt(FARMER_AT_SIGN);
            await pause(1100, 100);
            lines.push(`Làm thuê nửa ngày: +${money(e.wage)}.`);
            say(lines.join(" "));
            break;
          case "restDone":
            lines.push(`Nghỉ ngơi ở nhà. Sức lực +${e.energy}.`);
            say(lines.join(" "));
            break;
          case "dayStarted":
            newDay = true;
            break;
          case "wentToField": {
            const target = plotId ?? 0;
            setFarmerAt(plotStandPoint(target));
            const seen = after.plots.filter(hasSigns).length;
            if (seen > 0) say(`Có ${seen} thửa thấy dấu hiệu lạ.`);
            await pause(650, 0);
            openNote(target);
            setPage(null);
            setBusy(false);
            return;
          }
        }
      }
      setNote(null);
      setFarmerAt(FARMER_HOME);
      if (newDay) {
        setNight(true);
        await pause(1700, 200);
        setNight(false);
        setDayBegun(false);
        setPage(null);
        flip();
        await pause(500, 0);
        if (after.phase.kind === "briefing") setBook("briefing");
      } else {
        setPage(null);
        if (before.phase.kind !== "halfDay" || before.phase.slot === "morning") {
          if (after.phase.kind === "halfDay" && after.phase.slot === "afternoon") say([...lines, "Sang buổi chiều."].join(" "));
        }
      }
      setBusy(false);
    },
    [flip, say, openNote],
  );

  /** Dispatches an option's action (or a given action) and plays what happened. */
  const run = useCallback(
    async (action: Action, plotId: number | null = null) => {
      const before = view;
      const out = game.perform(action);
      if (!out.ok) {
        say(out.reason);
        return false;
      }
      if (out.view.phase.kind === "settlement" || out.view.phase.kind === "gameOver") setNote(null);
      await play(out.events, before, out.view, plotId);
      return true;
    },
    [game, view, play, say],
  );

  /** Runs the first option of a target, or says why it is locked. */
  const runTarget = useCallback(
    (target: OptionTarget) => {
      if (busy) return;
      const option: ActionOption | undefined = getActionOptions(view, target)[0];
      if (!option) return;
      if (!option.enabled) {
        say(option.reason ?? "Không làm được.");
        return;
      }
      setDayBegun(true);
      void run(option.action, target.kind === "plot" ? target.plotId : null);
    },
    [busy, view, run, say],
  );

  const onPlot = useCallback(
    (plotId: number) => {
      if (busy) return;
      if (isInField(view)) {
        setFarmerAt(plotStandPoint(plotId));
        openNote(plotId);
        return;
      }
      runTarget({ kind: "plot", plotId });
    },
    [busy, view, openNote, runTarget],
  );

  const onHover = useCallback((label: string | null, cx?: number, cy?: number) => {
    const g = gameRef.current?.getBoundingClientRect();
    setHover((h) => ({ label, x: cx !== undefined && g ? cx - g.left : h.x, y: cy !== undefined && g ? cy - g.top : h.y }));
  }, []);

  const phase = visualPhase(view, dayBegun, night);
  const strip = stripText(view, phase);
  const endHalfDay = getActionOptions(view, { kind: "day" }).find((o) => o.id === "endHalfDay");
  const shown = page ?? pageOf(view);

  return (
    <div className="game" ref={gameRef}>
      <World>
        <Scene
          view={view}
          farmerAt={farmerAt}
          overlay={<TimeOfDay phase={phase} />}
          onPlot={onPlot}
          onHouse={() => runTarget({ kind: "house" })}
          onSign={() => runTarget({ kind: "workSign" })}
          onLedger={() => !busy && setBook("ledger")}
          onTrader={() => !busy && setBook("trader")}
          onHover={onHover}
        />
      </World>
      <Rain weather={night ? undefined : view.weather.forecast[0]?.predicted} />
      <Calendar month={shown.month} dayOfMonth={shown.dayOfMonth} seasonKey={shown.seasonKey} daysToTet={shown.daysToTet} flipKey={flipKey} />
      <Purse cash={view.cash} energy={view.energy} energyMax={view.energyMax} uyTin={view.uyTin} forecastToday={view.weather.forecast[0]} />
      <PhaseStrip phase={phase} lead={strip.lead} text={strip.text}>
        {phase === "briefing" && !busy && (
          <button type="button" className="btn" onClick={() => setBook("briefing")}>
            Mở bản tin
          </button>
        )}
        {isInField(view) && endHalfDay?.enabled && !busy && (
          <button type="button" className="btn" onClick={() => void run(endHalfDay.action)}>
            {endHalfDay.label}
          </button>
        )}
      </PhaseStrip>
      <HoverTag {...hover} />
      <Toast message={toast.message} id={toast.id} />

      {book === "briefing" && view.phase.kind === "briefing" && (
        <Briefing
          view={view}
          data={data}
          canSkip={getActionOptions(view, { kind: "day" }).some((o) => o.id === "skip" && o.enabled)}
          onStartDay={() => {
            setBook(null);
            setDayBegun(true);
          }}
          onSkip={() => setBook("skip")}
        />
      )}

      {note !== null && anchor && isInField(view) && (
        <PinnedNote key={note} title={`Thửa ${note + 1}`} anchor={anchor.box} container={anchor.size} index={note} onClose={() => setNote(null)}>
          <PlotNote
            view={view}
            data={data}
            plotId={note}
            onChoose={(action, option) => {
              void run(action).then((ok) => {
                if (ok && option.credit !== null && action === option.credit.action) say(`Ghi nợ đại lý: ${money(option.credit.debtAdded)}.`);
              });
            }}
          />
        </PinnedNote>
      )}

      {debug && <DebugPanel game={game} />}
    </div>
  );
}
