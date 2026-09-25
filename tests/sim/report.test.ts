import { describe, expect, it } from "vitest";
import { replay } from "../../core/save";
import { BOTS } from "../../sim/bots";
import { buildReport, cashByDayCsv, percentile, runsCsv } from "../../sim/report";
import { runGame } from "../../sim/runGame";
import { data } from "../helpers";

describe("percentile", () => {
  it("interpolates linearly", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([0, 10], 25)).toBe(2.5);
    expect(percentile([7], 90)).toBe(7);
    expect(percentile([], 50)).toBeNaN();
  });
});

describe("bots and the runner", () => {
  it.each(Object.keys(BOTS))("%s finishes deterministically, and its save replays", (name) => {
    const policy = BOTS[name];
    if (!policy) throw new Error(name);
    const a = runGame(3, policy, data);
    const b = runGame(3, policy, data);
    expect(a.summary).toEqual(b.summary);
    expect(a.session.state.phase.kind).toBe("gameOver");
    expect(a.cashByDay).toHaveLength(365);
    expect(a.cashByDay.every(Number.isFinite)).toBe(true);
    expect(replay(a.session.save, data)).toEqual(a.session.state);
  });

  it("builds a report and CSVs", () => {
    const results = [1, 2, 3].map((seed) => {
      const { session: _s, ...r } = runGame(seed, BOTS.safe!, data);
      return r;
    });
    const report = buildReport("safe", results);
    expect(report.runs).toBe(3);
    expect(report.maxDebtStage.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(runsCsv(results).trim().split("\n")).toHaveLength(4);
    expect(cashByDayCsv({ safe: results }, 365).trim().split("\n")).toHaveLength(366);
  });
});
