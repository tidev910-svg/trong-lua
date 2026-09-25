import { describe, expect, it } from "vitest";
import { playtestStats } from "../../core/playtest";
import { load, parseSave, replay, serializeSave } from "../../core/save";
import { BOTS } from "../../sim/bots";
import { runGame } from "../../sim/runGame";
import { data } from "../helpers";

describe("playtest data in the save (M4.1)", () => {
  const { session } = runGame(36, BOTS.average!, data);
  const stats = playtestStats(session.save, session.state);

  it("counts skips, skipped days, field visits and debt stress from the save and state", () => {
    const skips = session.save.actions.filter((a) => a.type === "skipUntil").length;
    expect(stats.skipCount).toBe(skips);
    expect(stats.skippedDays).toBeGreaterThanOrEqual(skips);
    expect(Object.values(stats.skipStops).reduce((a, b) => a + b, 0)).toBe(skips);
    expect(stats.fieldVisits).toBeGreaterThan(0);
    expect(stats).toMatchObject({
      lastDay: session.state.day,
      endReason: "yearEnd",
      actions: session.save.actions.length,
      maxDebtStage: session.state.stats.maxDebtStage,
      seasonsSettled: session.state.settledSeasons.length,
    });
  });

  it("does not affect loading or replaying", () => {
    const withMeta = { ...session.save, playtest: { ...stats, startedAt: "2026-09-26T00:00:00.000Z", lastPlayedAt: "2026-09-26T01:00:00.000Z", sessions: 2 } };
    const parsed = parseSave(serializeSave(withMeta));
    expect(parsed.playtest?.sessions).toBe(2);
    expect(replay(parsed, data)).toEqual(session.state);
    expect(load(parsed, data).state).toEqual(session.state);
  });
});
