import type { GameData, SeasonId } from "../../data/schemas";
import { getActionOptions, quoteOption, type ActionOption, type OptionTarget } from "../../core/actionOptions";
import type { PlayerView, PlotView } from "../../core/playerView";
import type { SignLevel } from "../../core/systems/pests";
import { seasonOfSowingDay } from "../../core/systems/calendar";
import { expectedSchedule } from "../../core/systems/growth";
import { sowingCost } from "../../core/systems/yield";
import { ALL_STOP_CONDITIONS, type Action } from "../../core/types";

/**
 * A bot policy (DATA_SPEC "Bot"). Concrete thresholds the table leaves open are chosen here (decision B18)
 * and logged in PROGRESS.md.
 */
export interface Policy {
  name: string;
  /** Variety for crops sown in this season. */
  varietyFor: (season: SeasonId) => string;
  /** May this bot sow a crop in this season, given the view? */
  sowsIn: (season: SeasonId, view: PlayerView) => boolean;
  /** Visit the field at least every N days while crops are in the ground. */
  visitEveryDays: number;
  visitOnAlert: boolean;
  /** Cure a pest from this sign level up. */
  cureFrom: SignLevel;
  preventiveOnAlert: boolean;
  /** "any": fix water when low or flooded; "lowOnly": only when low ("lệch nặng" for the risky bot). */
  water: "any" | "lowOnly";
  /** Supplies on store credit when allowed. */
  useStoreCredit: boolean;
  loanShark: "never" | "whenShort" | "freely";
  /** Share of expected yield sold in advance on each crop (0 = never). */
  advanceSaleRatio: number;
  harvest: "machine" | "hand";
  /** Wait up to N days for a better price when today's price is below the month's base price. */
  waitSaleDays: number;
}

/** Extra cash the "freely" borrower keeps on hand (B18). */
const FREE_BORROWER_BUFFER = 2_000_000;

/** Cash kept aside for living costs before paying debts or buying (B18: 5 days of living cost). */
function reserve(data: GameData): number {
  return 5 * data.economy.livingCostPerDay;
}

/** Last possible day to harvest safely: sowing must be expected harvestable by then (B18: 5 days before the end). */
function latestHarvestDay(data: GameData): number {
  return data.calendar.daysInYear - 1 - 5;
}

const SIGN_ORDER: Record<SignLevel, number> = { light: 1, medium: 2, heavy: 3 };

function plotNeedsSowing(plot: PlotView, view: PlayerView, policy: Policy, data: GameData): boolean {
  if (!view.landAccess || (plot.status !== "empty" && plot.status !== "harvested")) return false;
  const season = seasonOfSowingDay(view.day, data.calendar);
  if (!policy.sowsIn(season, view)) return false;
  return expectedSchedule(view.day, policy.varietyFor(season), data).harvestable <= latestHarvestDay(data);
}

function knownStage(plot: PlotView): string | null {
  return plot.known && plot.known.lastVisitDay >= (plot.crop?.sowDay ?? 0) ? plot.known.stage : null;
}

function needsFertilizer(plot: PlotView, stage: string | null, data: GameData): boolean {
  if (plot.crop === null || stage === null) return false;
  if (!(data.crop.fertilizer.recommendedStages as readonly string[]).includes(stage)) return false;
  return !plot.crop.fertilizerApps.some((a) => a.stage === stage);
}

/** Stage the public schedule expects today. */
function scheduledStage(plot: PlotView, day: number): string | null {
  if (plot.crop === null) return null;
  const e = plot.crop.expected;
  if (day >= e.harvestable) return "harvestable";
  if (day >= e.ripening) return "ripening";
  if (day >= e.flowering) return "flowering";
  if (day >= e.panicle) return "panicle";
  if (day >= e.tillering) return "tillering";
  return "germination";
}

function daysSinceVisit(view: PlayerView): number {
  const planted = view.plots.filter((p) => p.status === "planted");
  if (planted.length === 0) return 0;
  const last = Math.min(...planted.map((p) => Math.max(p.known?.lastVisitDay ?? -1, p.crop?.sowDay ?? 0)));
  return view.day - last;
}

/** Does the bot want to go to the field today? */
function wantsField(view: PlayerView, policy: Policy, data: GameData): boolean {
  if (!view.landAccess) return false;
  if (view.plots.some((p) => plotNeedsSowing(p, view, policy, data))) return true;
  for (const plot of view.plots.filter((p) => p.status === "planted")) {
    const expected = scheduledStage(plot, view.day);
    if (expected === "harvestable") return true;
    if (needsFertilizer(plot, expected, data)) return true;
  }
  if (view.plots.some((p) => p.status === "planted")) {
    if (daysSinceVisit(view) >= policy.visitEveryDays) return true;
    if (policy.visitOnAlert && view.radio.pestAlerts.length > 0 && daysSinceVisit(view) >= 2) return true;
  }
  return false;
}

function option(view: PlayerView, target: OptionTarget, id: string): ActionOption | undefined {
  return getActionOptions(view, target).find((o) => o.id === id);
}

/**
 * How to buy supplies, from the option: on store credit when the policy uses it and the dealer accepts,
 * else cash if affordable (keeping `keep` aside). null = cannot buy now.
 */
function purchase(opt: ActionOption | undefined, view: PlayerView, policy: Policy, keep = 0): Action | null {
  if (opt === undefined || opt.energy > view.energy) return null;
  if (policy.useStoreCredit && opt.credit !== null && view.cash - keep >= opt.credit.cashCost) return opt.credit.action;
  return opt.enabled && view.cash - keep >= opt.cost ? opt.action : null;
}

/** One field action, or endHalfDay when nothing more is useful or affordable. */
function fieldAction(view: PlayerView, policy: Policy, data: GameData): Action {
  const planted = view.plots.filter((p) => p.status === "planted" && p.crop !== null);
  const plotTarget = (plotId: number): OptionTarget => ({ kind: "plot", plotId });

  // 1. Harvest
  for (const plot of planted) {
    if (knownStage(plot) !== "harvestable") continue;
    const machine = option(view, plotTarget(plot.id), "harvest:machine");
    const hand = option(view, plotTarget(plot.id), "harvest:hand");
    if (policy.harvest === "hand" && hand?.enabled) return hand.action;
    if (machine?.enabled) return machine.action;
    if (hand?.enabled) return hand.action;
  }

  // 2. Cure pests
  for (const plot of planted) {
    for (const pest of data.pests) {
      const sign = plot.known?.signs[pest.id] ?? null;
      if (sign === null || SIGN_ORDER[sign] < SIGN_ORDER[policy.cureFrom]) continue;
      const buy = purchase(option(view, plotTarget(plot.id), `spray:cure:${pest.id}`), view, policy);
      if (buy) return buy;
    }
  }

  // 3. Preventive spray during an alert (once per alert per plot)
  if (policy.preventiveOnAlert) {
    for (const alert of view.radio.pestAlerts) {
      for (const plot of planted) {
        const stage = knownStage(plot);
        if (stage === "harvestable" || stage === "ripening") continue;
        if (plot.crop?.sprayLog.some((s) => s.pestId === alert.pestId && s.day >= alert.startDay)) continue;
        const buy = purchase(option(view, plotTarget(plot.id), `spray:preventive:${alert.pestId}`), view, policy);
        if (buy) return buy;
      }
    }
  }

  // 4. Fertilize in the recommended stages
  for (const plot of planted) {
    if (!needsFertilizer(plot, knownStage(plot), data)) continue;
    const buy = purchase(option(view, plotTarget(plot.id), "fertilize"), view, policy);
    if (buy) return buy;
  }

  // 5. Water
  for (const plot of planted) {
    const level = plot.known?.waterLevel ?? "ok";
    const fix = policy.water === "any" ? level !== "ok" : level === "low";
    if (!fix || knownStage(plot) === "harvestable") continue;
    const water = option(view, plotTarget(plot.id), "adjustWater");
    if (water?.enabled && view.cash - reserve(data) >= water.cost) return water.action;
  }

  // 6. Sow
  for (const plot of view.plots) {
    if (!plotNeedsSowing(plot, view, policy, data)) continue;
    const variety = policy.varietyFor(seasonOfSowingDay(view.day, data.calendar));
    const buy = purchase(option(view, plotTarget(plot.id), `sow:${variety}:broadcast`), view, policy, reserve(data));
    if (buy === null) break;
    return buy;
  }

  return { type: "endHalfDay" };
}

/**
 * Money the bot expects to need soon: sowing on plots waiting for it, plus the reserve. Sowing options only
 * exist while in the field, so this estimate uses the public price list (sowingCost).
 */
function upcomingNeed(view: PlayerView, policy: Policy, data: GameData): number {
  let need = reserve(data);
  for (const plot of view.plots) {
    if (!plotNeedsSowing(plot, view, policy, data)) continue;
    const cost = sowingCost(policy.varietyFor(seasonOfSowingDay(view.day, data.calendar)), "broadcast", data);
    need += cost.landPrep + cost.labor + (policy.useStoreCredit && view.credit.storeCreditOpen ? 0 : cost.seed);
  }
  for (const loan of view.loans) if (loan.dueDay <= view.day) need += loan.balance;
  return need;
}

/** Money matters that do not use a half-day. Returns null when there is nothing to do. */
function moneyAction(view: PlayerView, policy: Policy, data: GameData): Action | null {
  const enabled = (target: OptionTarget, id: string): ActionOption | undefined => {
    const o = option(view, target, id);
    return o?.enabled ? o : undefined;
  };
  const ledger: OptionTarget = { kind: "ledger" };

  // Sell lots (wait for a better price only while the price is below the month's base price)
  for (const lot of view.lots) {
    const cheap = view.market.pricePerKg < view.market.basePricePerKg;
    const sell = enabled({ kind: "trader" }, `sell:${lot.id}`);
    if (sell && (!cheap || lot.nightsWaited >= policy.waitSaleDays)) return sell.action;
  }

  const reRent = enabled(ledger, "reRent");
  if (reRent) return reRent.action;

  // Pay what is due today or late (most urgent first), keeping the reserve
  const due = [...view.loans].filter((l) => l.dueDay <= view.day).sort((a, b) => a.dueDay - b.dueDay);
  for (const loan of due) {
    const available = view.cash - reserve(data);
    if (available <= 0) break;
    const rollOver = enabled(ledger, `rollOver:${loan.id}`);
    if (rollOver && available < loan.balance && rollOver.cost > 0 && available >= rollOver.cost) return rollOver.action;
    const repay = enabled(ledger, `repay:${loan.id}`);
    if (repay) return quoteOption(view, repay, available, data).action;
  }
  // Family loan at the very end of the year
  const family = view.loans.find((l) => l.kind === "family");
  const repayFamily = family ? enabled(ledger, `repay:${family.id}`) : undefined;
  if (family && repayFamily && view.day >= family.dueDay - 3 && view.cash - reserve(data) > 0) {
    return quoteOption(view, repayFamily, view.cash - reserve(data), data).action;
  }

  // Rent due and not enough money: ask for more time
  const rent = view.loans.find((l) => l.kind === "rent" && l.lateSinceDay === null && l.dueDay <= view.day);
  const extension = enabled(ledger, "rentExtension");
  if (rent && extension && view.cash - reserve(data) < rent.balance) return extension.action;

  // Borrow
  const buffer = policy.loanShark === "freely" ? FREE_BORROWER_BUFFER : 0;
  const shortBy = upcomingNeed(view, policy, data) + buffer - view.cash;
  const shark = enabled(ledger, "loanShark");
  if (policy.loanShark !== "never" && shortBy > 0 && shark?.range) {
    const step = 500_000;
    return quoteOption(view, shark, Math.min(shark.range.max, Math.ceil(shortBy / step) * step), data).action;
  }

  // Advance sale
  if (policy.advanceSaleRatio > 0) {
    for (const plot of view.plots) {
      const advance = plot.advanceContract === null ? enabled(ledger, `advance:${plot.id}`) : undefined;
      if (advance) return quoteOption(view, advance, Math.round(policy.advanceSaleRatio * 100), data).action;
    }
  }
  return null;
}

/** Days until the bot next wants to act on its own, used as the skip length. */
function skipDays(view: PlayerView, policy: Policy): number {
  const planted = view.plots.filter((p) => p.status === "planted");
  if (planted.length === 0) return 7;
  return Math.max(1, policy.visitEveryDays - daysSinceVisit(view));
}

/**
 * The bot's next action. `skipMoney` is set by the runner after a money action was refused this step,
 * so the bot moves on to its day plan instead of retrying.
 */
export function decide(view: PlayerView, policy: Policy, data: GameData, skipMoney = false): Action {
  const phase = view.phase;
  if (phase.kind === "settlement") return { type: "acknowledge" };

  const money = skipMoney ? null : moneyAction(view, policy, data);
  if (money) return money;

  if (phase.kind === "halfDay" && phase.activity === "field") return fieldAction(view, policy, data);

  const wantField = wantsField(view, policy, data) && view.energy >= data.economy.energy.fieldVisit + 10;
  if (wantField) return { type: "chooseActivity", activity: "field" };
  if (phase.kind === "briefing") {
    return { type: "skipUntil", defaultActivity: "hired_work", stopOn: [...ALL_STOP_CONDITIONS], maxDays: skipDays(view, policy) };
  }
  const work = view.hiredWorkAvailable && view.energy >= data.economy.hiredWork.energyCost;
  return { type: "chooseActivity", activity: work ? "hired_work" : "rest" };
}
