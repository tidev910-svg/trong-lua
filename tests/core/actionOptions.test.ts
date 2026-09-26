import { describe, expect, it } from "vitest";
import { getActionOptions, quoteOption, type ActionOption, type OptionTarget } from "../../core/actionOptions";
import { applyAction } from "../../core/actions";
import { createInitialState } from "../../core/init";
import { getPlayerView, type PlayerView } from "../../core/playerView";
import { dispatch, newSession } from "../../core/save";
import { expectedSchedule } from "../../core/systems/growth";
import type { Action, GameState } from "../../core/types";
import { average } from "../../sim/bots/average";
import { risky } from "../../sim/bots/risky";
import { safe } from "../../sim/bots/safe";
import { runGame } from "../../sim/runGame";
import { crop, data, stateWithCrops } from "../helpers";
import { playRandom } from "../randomAgent";

function act(state: GameState, action: Action): GameState {
  const result = applyAction(state, action, data);
  if (!result.ok) throw new Error(`refused ${action.type}: ${result.reason}`);
  return result.state;
}

const accepted = (state: GameState, action: Action) => applyAction(state, action, data).ok;

function allTargets(view: PlayerView): OptionTarget[] {
  return [
    { kind: "house" },
    { kind: "workSign" },
    { kind: "ledger" },
    { kind: "trader" },
    { kind: "day" },
    ...view.plots.map((p): OptionTarget => ({ kind: "plot", plotId: p.id })),
  ];
}

/** Checks the contract of every option in this state; returns how many options were checked. */
function checkOptions(state: GameState): number {
  const view = getPlayerView(state, data);
  let n = 0;
  for (const target of allTargets(view)) {
    for (const opt of getActionOptions(view, target)) {
      n++;
      const where = `${target.kind} ${opt.id} (day ${state.day}, ${state.phase.kind})`;
      expect(accepted(state, opt.action), where).toBe(opt.enabled);
      if (opt.enabled) expect(opt.reason, where).toBeNull();
      else expect(opt.reason, where).toMatch(/\S/);
      if (opt.credit !== null) expect(accepted(state, opt.credit.action), where).toBe(true);
      if (opt.enabled && opt.range !== null) {
        for (const v of [opt.range.min, opt.range.max]) expect(accepted(state, quoteOption(view, opt, v, data).action), `${where} @${v}`).toBe(true);
      }
    }
  }
  return n;
}

/** States along a recorded run (every `every`-th action). */
function statesAlong(actions: readonly Action[], seed: number, every: number): GameState[] {
  const out: GameState[] = [];
  let state = createInitialState(seed, data);
  actions.forEach((a, i) => {
    state = act(state, a);
    if (i % every === 0) out.push(state);
  });
  return out;
}

describe("getActionOptions contract: enabled ⇔ applyAction accepts", () => {
  it.each([
    ["safe", safe, 13],
    ["average", average, 5],
    ["risky", risky, 1],
  ] as const)("along a %s bot year", (_name, policy, seed) => {
    const { session } = runGame(seed, policy, data);
    let checked = 0;
    for (const s of statesAlong(session.save.actions, seed, 3)) checked += checkOptions(s);
    expect(checked).toBeGreaterThan(500);
  });

  it("along random play (many refusals, odd states)", () => {
    const { session } = playRandom(7, data, 1500);
    let checked = 0;
    for (const s of statesAlong(session.save.actions, 7, 2)) checked += checkOptions(s);
    expect(checked).toBeGreaterThan(500);
  });
});

describe("options by target", () => {
  const find = (opts: ActionOption[], id: string) => {
    const o = opts.find((x) => x.id === id);
    if (!o) throw new Error(`no option ${id} in ${opts.map((x) => x.id).join(", ")}`);
    return o;
  };
  const inField = (s: GameState) => act(s, { type: "chooseActivity", activity: "field" });

  it("a plot outside the field offers going to the field", () => {
    const view = getPlayerView(createInitialState(1, data), data);
    const opts = getActionOptions(view, { kind: "plot", plotId: 0 });
    expect(opts.map((o) => o.id)).toEqual(["goToField"]);
    expect(opts[0]).toMatchObject({ enabled: true, energy: data.economy.energy.fieldVisit });
  });

  it("an empty plot in the field: every variety × sạ/cấy with cost, energy and expected harvest day", () => {
    const s = inField({ ...createInitialState(1, data), day: 3 });
    const opts = getActionOptions(getPlayerView(s, data), { kind: "plot", plotId: 0 });
    expect(opts).toHaveLength(data.varieties.length * 2);
    const a = find(opts, "sow:variety_a:transplant");
    expect(a.label).toMatch(/^Cấy /);
    expect(a.expectedHarvestDay).toBe(expectedSchedule(3, "variety_a", data).harvestable);
    expect(a.cost).toBeGreaterThan(0);
    expect(a.energy).toBeGreaterThan(0);
  });

  it("store credit: cash part and marked-up debt; still there when cash is short, gone when credit is refused", () => {
    const rich = inField({ ...createInitialState(1, data), day: 3 });
    const a = find(getActionOptions(getPlayerView(rich, data), { kind: "plot", plotId: 0 }), "sow:variety_a:broadcast");
    const poor = { ...rich, cash: a.cost - 1 };
    const b = find(getActionOptions(getPlayerView(poor, data), { kind: "plot", plotId: 0 }), "sow:variety_a:broadcast");
    expect(b.enabled).toBe(false);
    expect(b.reason).toMatch(/tiền/);
    const seed = Math.round(data.varieties[0]!.seedCostPerPlot * data.crop.sowing.broadcast.seedMultiplier);
    expect(b.credit).toMatchObject({ cashCost: a.cost - seed, debtAdded: Math.round(seed * (1 + data.finance.storeCredit.markup)) });
    expect(a.credit).toEqual(b.credit);
    const broke = { ...rich, cash: 0 };
    expect(find(getActionOptions(getPlayerView(broke, data), { kind: "plot", plotId: 0 }), "sow:variety_a:broadcast").credit).toBeNull();
    const distrusted = { ...rich, uyTin: data.finance.storeCredit.minUyTin - 1 };
    expect(find(getActionOptions(getPlayerView(distrusted, data), { kind: "plot", plotId: 0 }), "sow:variety_a:broadcast").credit).toBeNull();
  });

  it("a growing plot: fertilize (on-time hint), cure only for visible signs, preventive for each pest, water", () => {
    const s = inField({
      ...stateWithCrops({ 0: crop({ sowDay: 0, growth: 20, pests: { brown_planthopper: 0.4, rice_blast: 0 } }) }),
      day: 20,
    });
    const opts = getActionOptions(getPlayerView(s, data), { kind: "plot", plotId: 0 });
    expect(opts.map((o) => o.id)).toEqual([
      "fertilize",
      "spray:cure:brown_planthopper",
      "spray:preventive:brown_planthopper",
      "spray:preventive:rice_blast",
      "adjustWater",
    ]);
    expect(find(opts, "fertilize").detail).toBe("Đúng lúc bón");
  });

  it("a ripe plot the player has seen: machine or hand harvest", () => {
    const s0 = stateWithCrops({ 0: crop({ sowDay: 0, growth: 95 }) });
    const ripe: GameState = { ...s0, day: 100, plots: s0.plots.map((p) => (p.id === 0 ? { ...p, status: "harvestable" } : p)) };
    const opts = getActionOptions(getPlayerView(inField(ripe), data), { kind: "plot", plotId: 0 });
    expect(opts.map((o) => o.id)).toEqual(["harvest:machine", "harvest:hand"]);
  });

  it("house and work sign say why they are locked while in the field", () => {
    const s = inField(createInitialState(1, data));
    const view = getPlayerView(s, data);
    expect(getActionOptions(view, { kind: "house" })[0]?.reason).toMatch(/ngoài đồng/);
    expect(getActionOptions(view, { kind: "workSign" })[0]?.reason).toMatch(/ngoài đồng/);
    expect(find(getActionOptions(view, { kind: "day" }), "endHalfDay").enabled).toBe(true);
  });

  it("work sign shows the wage; house shows the energy it restores", () => {
    const s: GameState = { ...createInitialState(1, data), hiredWorkAvailable: true, energy: 50 };
    const view = getPlayerView(s, data);
    expect(getActionOptions(view, { kind: "workSign" })[0]).toMatchObject({ enabled: true, gain: { cash: data.economy.hiredWork.wageHalfDay } });
    expect(getActionOptions(view, { kind: "house" })[0]?.gain?.energy).toBe(Math.min(data.economy.energy.max - 50, data.economy.energy.restHalfDay));
    const none = getPlayerView({ ...s, hiredWorkAvailable: false }, data);
    expect(getActionOptions(none, { kind: "workSign" })[0]?.reason).toMatch(/không có ai thuê/);
  });

  it("ledger: repay each loan, loan shark, advance sale per planted plot, rent extension, quit", () => {
    const s = stateWithCrops({ 1: crop({ sowDay: 2 }) });
    const ids = getActionOptions(getPlayerView(s, data), { kind: "ledger" }).map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(["loanShark", "advance:1", "rentExtension", "quit"]));
    expect(ids.filter((id) => id.startsWith("repay:"))).toHaveLength(s.loans.length);
    expect(ids).not.toContain("reRent");
  });

  it("trader: one sale per lot with its value", () => {
    const s: GameState = {
      ...createInitialState(1, data),
      harvestLots: [{ id: "lot-9", plotId: 2, varietyId: "variety_a", seasonKey: "DX-1", kg: 700, harvestDay: 0, nightsWaited: 0 }],
    };
    const view = getPlayerView(s, data);
    const [sell] = getActionOptions(view, { kind: "trader" });
    expect(sell).toMatchObject({ id: "sell:lot-9", enabled: true, gain: { cash: view.lots[0]?.valueNow } });
  });
});

describe("quoteOption matches what the action really does", () => {
  const s = stateWithCrops({ 1: crop({ sowDay: 2 }) });
  const view = getPlayerView(s, data);
  const ledger = getActionOptions(view, { kind: "ledger" });

  it("loan shark: cash now, debt and due day", () => {
    const opt = ledger.find((o) => o.id === "loanShark")!;
    const q = quoteOption(view, opt, 2_000_000, data);
    const after = act(s, q.action);
    const loan = after.loans.find((l) => l.kind === "loan_shark")!;
    expect(after.cash - s.cash).toBe(q.receive);
    expect(loan.balance).toBe(q.owe);
    expect(loan.dueDay).toBe(q.dueDay);
  });

  it("advance sale: cash now and kg owed, by whole percent", () => {
    const opt = ledger.find((o) => o.id === "advance:1")!;
    const q = quoteOption(view, opt, 30, data);
    const after = act(s, q.action);
    expect(after.cash - s.cash).toBe(q.receive);
    expect(after.advanceContracts[0]?.kg).toBeCloseTo(q.kg!, 9);
    expect(quoteOption(view, opt, 999, data).action).toMatchObject({ ratio: opt.range!.max / 100 });
  });

  it("repay: what is left on the loan", () => {
    const opt = ledger.find((o) => o.id.startsWith("repay:"))!;
    const q = quoteOption(view, opt, 100_000, data);
    const after = act(s, q.action);
    const loanId = (q.action as { loanId: string }).loanId;
    expect(after.loans.find((l) => l.id === loanId)?.balance).toBe(q.owe);
  });
});

describe("options never reveal hidden information", () => {
  it("a crop that is really ripe looks the same as a growing one in the ledger (advance sale until harvest)", () => {
    const s = stateWithCrops({ 1: crop({ sowDay: 2 }) });
    const ripe: GameState = { ...s, plots: s.plots.map((p) => (p.id === 1 ? { ...p, status: "harvestable" } : p)) };
    expect(getPlayerView(ripe, data).actionOptions).toEqual(getPlayerView(s, data).actionOptions);
  });
});

describe("presentation events (M2.0)", () => {
  const kinds = (s: GameState, from: number) => s.log.slice(from).map((e) => e.kind);

  it("field, hired work and rest are logged with their slot; a new day logs dayStarted", () => {
    const s0: GameState = { ...createInitialState(1, data), hiredWorkAvailable: true };
    const s1 = act(s0, { type: "chooseActivity", activity: "field" });
    expect(s1.log.at(-1)).toEqual({ day: 0, kind: "wentToField", slot: "morning" });
    const s2 = act(act(s1, { type: "endHalfDay" }), { type: "chooseActivity", activity: "hired_work" });
    expect(kinds(s2, s1.log.length)).toEqual(["hiredWorkDone", "dayStarted"]);
    expect(s2.log.find((e) => e.kind === "hiredWorkDone")).toMatchObject({ slot: "afternoon", wage: data.economy.hiredWork.wageHalfDay });
    expect(s2.log.at(-1)).toEqual({ day: 1, kind: "dayStarted" });
    const s3 = act(s2, { type: "chooseActivity", activity: "rest" });
    expect(s3.log.at(-1)).toMatchObject({ kind: "restDone", slot: "morning" });
  });

  it("a skip logs one skipDayPassed per day, and skipStopped totals the wage", () => {
    const s0 = { ...createInitialState(13, data), day: 20 };
    const s = act(s0, { type: "skipUntil", defaultActivity: "hired_work", stopOn: [], maxDays: 6 });
    const days = s.log.filter((e) => e.kind === "skipDayPassed");
    expect(days.map((e) => e.day)).toEqual([21, 22, 23, 24, 25, 26]);
    const stop = s.log.at(-1);
    expect(stop).toMatchObject({ kind: "skipStopped", days: 6 });
    const earned = days.reduce((sum, e) => sum + (e.kind === "skipDayPassed" ? e.earned : 0), 0);
    expect(stop?.kind === "skipStopped" && stop.earned).toBe(earned);
    expect(earned).toBe(s.ledger.filter((e) => e.category === "hired_work").reduce((sum, e) => sum + e.amount, 0));
  });

  it("dispatch returns the public events the action produced", () => {
    const session = newSession(3, data);
    const out = dispatch(session, { type: "skipUntil", defaultActivity: "rest", stopOn: [], maxDays: 3 }, data);
    expect(out.events.map((e) => e.kind).filter((k) => k === "skipDayPassed")).toHaveLength(3);
    expect(out.events.at(-1)?.kind).toBe("skipStopped");
    const refused = dispatch(out.session, { type: "endHalfDay" }, data);
    expect(refused.events).toEqual([]);
  });
});
