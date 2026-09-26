import type { GameData } from "../data/schemas";
import type { PlaytestMeta } from "./playtest";
import { applyAction } from "./actions";
import { createInitialState } from "./init";
import { isPublicEvent } from "./playerView";
import { STATE_VERSION, type Action, type ActionResult, type GameEvent, type GameState } from "./types";

/** Days between snapshots kept in a save (spec §13 "snapshot định kỳ"). */
export const SNAPSHOT_EVERY_DAYS = 30;

export interface SaveFile {
  version: number;
  seed: number;
  /** Accepted actions only (decision A15), in order. */
  actions: Action[];
  /** Optional shortcuts for loading: the state after `actionCount` actions. */
  snapshots?: { day: number; actionCount: number; state: GameState }[];
  /** Playtest data (M4.1); ignored when loading or replaying. */
  playtest?: PlaytestMeta;
}

/** A running game plus its save, kept in step. */
export interface Session {
  state: GameState;
  save: SaveFile;
}

export function newSession(seed: number, data: GameData): Session {
  return { state: createInitialState(seed, data), save: { version: STATE_VERSION, seed, actions: [] } };
}

/**
 * Applies an action and records it if accepted. A snapshot is added when the day crosses a
 * SNAPSHOT_EVERY_DAYS boundary. `events` are the public events this action produced, in order
 * (what the UI animates; decision M2.0-C).
 */
export function dispatch(session: Session, action: Action, data: GameData): { session: Session; result: ActionResult; events: GameEvent[] } {
  const result = applyAction(session.state, action, data);
  if (!result.ok) return { session, result, events: [] };
  const events = result.state.log.slice(session.state.log.length).filter(isPublicEvent);
  const actions = [...session.save.actions, action];
  let snapshots = session.save.snapshots;
  const lastSnapshotDay = snapshots?.at(-1)?.day ?? 0;
  if (Math.floor(result.state.day / SNAPSHOT_EVERY_DAYS) > Math.floor(lastSnapshotDay / SNAPSHOT_EVERY_DAYS)) {
    snapshots = [...(snapshots ?? []), { day: result.state.day, actionCount: actions.length, state: result.state }];
  }
  const save: SaveFile = snapshots ? { ...session.save, actions, snapshots } : { ...session.save, actions };
  return { session: { state: result.state, save }, result, events };
}

export class SaveError extends Error {
  override name = "SaveError";
}

/** Rebuilds the state by replaying every action from the seed (ignores snapshots). Throws if an action is refused. */
export function replay(save: SaveFile, data: GameData, upTo = save.actions.length): GameState {
  if (save.version !== STATE_VERSION) throw new SaveError(`save version ${save.version} does not match game version ${STATE_VERSION}`);
  let state = createInitialState(save.seed, data);
  for (let i = 0; i < upTo; i++) {
    const action = save.actions[i];
    if (action === undefined) break;
    const result = applyAction(state, action, data);
    if (!result.ok) throw new SaveError(`action #${i} (${action.type}) was refused on replay: ${result.reason}`);
    state = result.state;
  }
  return state;
}

/** Loads a save: from the latest snapshot if there is one, replaying only the actions after it. */
export function load(save: SaveFile, data: GameData): Session {
  if (save.version !== STATE_VERSION) throw new SaveError(`save version ${save.version} does not match game version ${STATE_VERSION}`);
  const snapshot = save.snapshots?.at(-1);
  let state = snapshot ? snapshot.state : createInitialState(save.seed, data);
  for (let i = snapshot ? snapshot.actionCount : 0; i < save.actions.length; i++) {
    const action = save.actions[i] as Action;
    const result = applyAction(state, action, data);
    if (!result.ok) throw new SaveError(`action #${i} (${action.type}) was refused on load: ${result.reason}`);
    state = result.state;
  }
  return { state, save };
}

export function serializeSave(save: SaveFile): string {
  return JSON.stringify(save);
}

/** Parses a save file text with a light shape check (full validation is replaying it). */
export function parseSave(text: string): SaveFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError("save file is not valid JSON");
  }
  if (typeof raw !== "object" || raw === null) throw new SaveError("save file must be an object");
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== "number" || !Number.isInteger(obj.seed) || !Array.isArray(obj.actions)) {
    throw new SaveError("save file needs numeric version, integer seed and an actions array");
  }
  return raw as SaveFile;
}
