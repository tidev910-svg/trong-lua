import { useCallback, useEffect, useMemo, useState } from "react";
import { loadData } from "../data/loadData";
import { getPlayerView, type PlayerView } from "../core/playerView";
import { playtestStats } from "../core/playtest";
import { dispatch, load, newSession, parseSave, serializeSave, type Session } from "../core/save";
import type { Action } from "../core/types";

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

export interface Game {
  data: typeof data;
  session: Session;
  view: PlayerView;
  /** Last refusal reason, shown until the next accepted action. */
  message: string | null;
  act: (action: Action) => boolean;
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
  const [message, setMessage] = useState<string | null>(null);
  const view = useMemo(() => getPlayerView(session.state, data), [session]);

  const act = useCallback(
    (action: Action) => {
      const out = dispatch(session, action, data);
      if (!out.result.ok) {
        setMessage(out.result.reason);
        return false;
      }
      setMessage(null);
      const next = out.session;
      if (next.state.day !== session.state.day || next.state.phase.kind === "gameOver") writeSave(next);
      setSession(next);
      return true;
    },
    [session],
  );

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

  return { data, session, view, message, act, newGame, importSave };
}
