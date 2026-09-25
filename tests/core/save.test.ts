import { describe, expect, it } from "vitest";
import { dispatch, load, newSession, parseSave, replay, SaveError, serializeSave, SNAPSHOT_EVERY_DAYS } from "../../core/save";
import { STATE_VERSION } from "../../core/types";
import { data } from "../helpers";
import { playRandom } from "../randomAgent";

describe("save = { version, seed, actions[] } (spec §13)", () => {
  it("records accepted actions only", () => {
    let session = newSession(1, data);
    session = dispatch(session, { type: "endHalfDay" }, data).session; // refused in briefing
    expect(session.save.actions).toEqual([]);
    session = dispatch(session, { type: "chooseActivity", activity: "rest" }, data).session;
    expect(session.save).toEqual({ version: STATE_VERSION, seed: 1, actions: [{ type: "chooseActivity", activity: "rest" }] });
  });

  it.each([1, 7, 42, 2026])("replaying a random game (seed %i) gives exactly the same state", (seed) => {
    const { session, refused } = playRandom(seed, data);
    expect(refused).toBeGreaterThan(0);
    expect(session.save.actions.length).toBeGreaterThan(50);
    expect(replay(session.save, data)).toEqual(session.state);
  });

  it("loading from the latest snapshot gives the same state as a full replay", () => {
    const { session } = playRandom(99, data);
    expect(session.save.snapshots?.length ?? 0).toBeGreaterThan(0);
    for (const snap of session.save.snapshots ?? []) expect(Math.floor(snap.day / SNAPSHOT_EVERY_DAYS)).toBeGreaterThan(0);
    expect(load(session.save, data).state).toEqual(session.state);
  });

  it("survives a text round trip", () => {
    const { session } = playRandom(5, data, 800);
    const parsed = parseSave(serializeSave(session.save));
    expect(parsed).toEqual(session.save);
    expect(load(parsed, data).state).toEqual(session.state);
  });

  it("replay can stop part way", () => {
    const { session } = playRandom(8, data, 300);
    const half = Math.floor(session.save.actions.length / 2);
    let partial = newSession(8, data);
    for (const action of session.save.actions.slice(0, half)) partial = dispatch(partial, action, data).session;
    expect(replay(session.save, data, half)).toEqual(partial.state);
  });

  it("rejects broken or foreign saves with a clear error", () => {
    expect(() => parseSave("{nope")).toThrow(SaveError);
    expect(() => parseSave(JSON.stringify({ version: 1, seed: 1.5, actions: [] }))).toThrow(/integer seed/);
    expect(() => replay({ version: STATE_VERSION + 1, seed: 1, actions: [] }, data)).toThrow(/version/);
    expect(() => replay({ version: STATE_VERSION, seed: 1, actions: [{ type: "endHalfDay" }] }, data)).toThrow(/refused on replay/);
  });
});
