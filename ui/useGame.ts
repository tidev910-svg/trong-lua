import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadData } from "../data/loadData";
import { getPlayerView, type PlayerView } from "../core/playerView";
import { playtestStats } from "../core/playtest";
import { dispatch, load, newSession, parseSave, serializeSave, type Session } from "../core/save";
import type { Action, GameEvent } from "../core/types";

export const SAVE_KEY = "trong-lua/save";

const data = loadData();

function randomSeed(): number {
  // UI only: core/ never uses Math.random.
  return Math.floor(Math.random() * 2 ** 31);
}

function readSave(): Session | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return text ? load(parseSave(text), data) : null;
  } catch {
    return null;
  }
}

/** React StrictMode runs state initializers twice in development; count each page load once. */
let openedThisPageLoad = false;

/** The save plus playtest data (M4.1); wall-clock times are UI-only. */
function withPlaytest(session: Session, openedNow = false): Session {
  const previous = session.save.playtest;
  const now = new Date().toISOString();
  const playtest = {
    ...playtestStats(session.save, session.state),
    startedAt: previous?.startedAt ?? now,
    lastPlayedAt: now,
    sessions: (previous?.sessions ?? 0) + (openedNow ? 1 : 0),
  };
  return { ...session, save: { ...session.save, playtest } };
}

function writeSave(session: Session): void {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(withPlaytest(session).save));
  } catch {
    // Storage full or blocked: the game keeps running, only autosave is lost.
  }
}

export type ActOutcome = { ok: true; events: GameEvent[]; view: PlayerView } | { ok: false; reason: string };

export interface Game {
  data: typeof data;
  session: Session;
  view: PlayerView;
  /** Last refusal reason, shown until the next accepted action. */
  message: string | null;
  act: (action: Action) => boolean;
  /** Like act, but returns the refusal reason or the public events the action produced (for animations). */
  perform: (action: Action) => ActOutcome;
  newGame: (seed?: number) => void;
  importSave: (text: string) => string | null;
}

/**
 * Game session for the UI (M2.1): every change goes through core `dispatch`; the save is written to
 * localStorage at the end of each day and when the run ends (spec §13: one save per run).
 */
export function useGame(): Game {
  const [session, setSession] = useState<Session>(() => {
    const restored = readSave() ?? newSession(randomSeed(), data);
    if (openedThisPageLoad) return restored;
    openedThisPageLoad = true;
    const opened = withPlaytest(restored, true);
    writeSave(opened);
    return opened;
  });
  // Latest session, updated as soon as an action is accepted: two clicks before the next render must
  // both apply (the second on top of the first), not both start from the same old state.
  const latest = useRef(session);
  latest.current = session;
  const [message, setMessage] = useState<string | null>(null);
  const view = useMemo(() => getPlayerView(session.state, data), [session]);

  const perform = useCallback(
    (action: Action): ActOutcome => {
      const current = latest.current;
      const out = dispatch(current, action, data);
      if (!out.result.ok) {
        setMessage(out.result.reason);
        return { ok: false, reason: out.result.reason };
      }
      setMessage(null);
      const next = out.session;
      // Autosave at the end of each day and when the run ends (spec §13).
      if (next.state.day !== current.state.day || next.state.phase.kind === "gameOver") writeSave(next);
      latest.current = next;
      setSession(next);
      return { ok: true, events: out.events, view: getPlayerView(next.state, data) };
    },
    [],
  );
  const act = useCallback((action: Action) => perform(action).ok, [perform]);

  // Keep where the player stopped even if they close the tab mid-day (playtest "thời điểm quit").
  useEffect(() => {
    const onLeave = () => writeSave(session);
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [session]);

  const newGame = useCallback((seed?: number) => {
    const next = newSession(seed ?? randomSeed(), data);
    writeSave(next);
    setMessage(null);
    setSession(next);
  }, []);

  const importSave = useCallback((text: string) => {
    try {
      const next = load(parseSave(text), data);
      writeSave(next);
      setMessage(null);
      setSession(next);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, []);

  return { data, session, view, message, act, perform, newGame, importSave };
}
