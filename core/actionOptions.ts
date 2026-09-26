import type { GameData, SowingMethod } from "../data/schemas";
import { actionRefusal } from "./actions";
import type { PlayerView } from "./playerView";
import { MAX_SKIP_DAYS } from "./skip";
import { expectedSchedule } from "./systems/growth";
import { lotValue } from "./systems/harvest";
import { reRentCost } from "./systems/debt";
import { advanceSaleQuote, loanSharkPrincipal, rollOverCost, sharkInterest, storeCreditPrice } from "./systems/finance";
import { sowingCost } from "./systems/yield";
import { ALL_STOP_CONDITIONS, type Action, type GameState, type LoanKind, type PayWith, type PlotState } from "./types";

/**
 * What the player can do, with costs and lock reasons, computed by core (ARCHITECTURE "getActionOptions").
 * Options are built from the state inside getPlayerView, using actionRefusal: the one place that knows the
 * rules. So an enabled option is always accepted by applyAction, and UI and bots never re-derive rules.
 * Nothing here may depend on hidden information beyond what applyAction itself would reveal.
 */

export type OptionTarget =
  | { kind: "plot"; plotId: number }
  | { kind: "house" }
  | { kind: "workSign" }
  | { kind: "ledger" }
  | { kind: "trader" }
  /** Day-level controls: end the half-day, skip, close the settlement. */
  | { kind: "day" };

/**
 * Store-credit alternative, present whenever buying on credit would be accepted. The UI shows it only when the
 * cash version is locked (UI_DIRECTION: "chỉ thiếu tiền"); bots may prefer it to keep cash.
 */
export interface CreditOption {
  action: Action;
  /** Part still paid in cash (land prep, labour). */
  cashCost: number;
  /** Marked-up price added to the store-credit debt. */
  debtAdded: number;
}

/**
 * Amount the player chooses. `field` names what the number is:
 * amount = VND (repay, loan shark), percent = whole percent of expected yield (advance sale), maxDays = skip length.
 * Every value in [min, max] is accepted when the option is enabled.
 */
export interface AmountRange {
  field: "amount" | "percent" | "maxDays";
  min: number;
  max: number;
}

export interface ActionOption {
  /** Stable key within a target, e.g. "sow:variety_a:transplant". */
  id: string;
  label: string;
  /** Short extra line (e.g. "đúng lúc bón"), or null. */
  detail: string | null;
  /** Action to dispatch (for ranged options: the default amount). */
  action: Action;
  /** Cash paid now, VND. */
  cost: number;
  /** Energy spent now. */
  energy: number;
  /** What the player gets now (wage, energy restored, sale money), or null. */
  gain: { cash: number; energy: number } | null;
  enabled: boolean;
  /** Why it is locked (Vietnamese), null when enabled. */
  reason: string | null;
  credit: CreditOption | null;
  range: AmountRange | null;
  /** For sowing: first day the crop is expected harvestable (public schedule). */
  expectedHarvestDay: number | null;
}

/** Terms of a ranged option for a chosen amount. */
export interface OptionQuote {
  action: Action;
  /** Cash received now. */
  receive: number;
  /** Debt owed afterwards on this line, and when it is due (null = no change / not a loan). */
  owe: number | null;
  dueDay: number | null;
  /** Advance sale: kg promised at harvest. */
  kg: number | null;
}

export function targetKey(target: OptionTarget): string {
  return target.kind === "plot" ? `plot:${target.plotId}` : target.kind;
}

/** Options for one target, as computed for this view. */
export function getActionOptions(view: PlayerView, target: OptionTarget): ActionOption[] {
  return view.actionOptions[targetKey(target)] ?? [];
}

// ---------------------------------------------------------------------------
// Building options from the state (called by getPlayerView only)
// ---------------------------------------------------------------------------

const LOAN_LABEL: Record<LoanKind, string> = {
  family: "Nợ họ hàng",
  rent: "Tiền thuê ruộng",
  store_credit: "Nợ đại lý (mua chịu)",
  loan_shark: "Vay nóng",
  household_arrears: "Nợ sinh hoạt",
};

export function loanLabel(kind: LoanKind): string {
  return LOAN_LABEL[kind];
}

const IN_FIELD_REASON = "Đang ở ngoài đồng. Bấm “Xong việc, về nhà” trước.";

interface OptionParts {
  id: string;
  label: string;
  detail?: string | null;
  action: Action;
  cost?: number;
  energy?: number;
  gain?: { cash: number; energy: number } | null;
  range?: AmountRange | null;
  expectedHarvestDay?: number | null;
  /** Reason shown instead of the refusal text (same refusal, friendlier words). */
  reasonOverride?: string | null;
}

function option(state: GameState, data: GameData, parts: OptionParts, credit: CreditOption | null = null): ActionOption {
  const refusal = actionRefusal(state, parts.action, data);
  const enabled = refusal === null;
  return {
    id: parts.id,
    label: parts.label,
    detail: parts.detail ?? null,
    action: parts.action,
    cost: parts.cost ?? 0,
    energy: parts.energy ?? 0,
    gain: parts.gain ?? null,
    enabled,
    reason: enabled ? null : (parts.reasonOverride ?? refusal),
    credit,
    range: parts.range ?? null,
    expectedHarvestDay: parts.expectedHarvestDay ?? null,
  };
}

/** The credit version of a purchase, if it would be accepted. */
function creditFor(state: GameState, data: GameData, creditAction: Action, cashCost: number, supplies: number): CreditOption | null {
  if (actionRefusal(state, creditAction, data) !== null) return null;
  return { action: creditAction, cashCost, debtAdded: storeCreditPrice(supplies, data) };
}

function inField(state: GameState): boolean {
  return state.phase.kind === "halfDay" && state.phase.activity === "field";
}

function varietyName(id: string, data: GameData): string {
  return data.varieties.find((v) => v.id === id)?.name ?? id;
}

function pestName(id: string, data: GameData): string {
  return (data.pests.find((p) => p.id === id)?.name ?? id).toLowerCase();
}

const METHOD_LABEL: Record<SowingMethod, string> = { broadcast: "Sạ", transplant: "Cấy" };

function sowOptions(state: GameState, plot: PlotState, data: GameData): ActionOption[] {
  const out: ActionOption[] = [];
  for (const variety of data.varieties) {
    for (const method of ["broadcast", "transplant"] as const) {
      const cost = sowingCost(variety.id, method, data);
      const act = (payWith: PayWith): Action => ({ type: "prepareAndSow", plotId: plot.id, variety: variety.id, method, payWith });
      const credit = creditFor(state, data, act("store_credit"), cost.landPrep + cost.labor, cost.seed);
      out.push(
        option(
          state,
          data,
          {
            id: `sow:${variety.id}:${method}`,
            label: `${METHOD_LABEL[method]} ${varietyName(variety.id, data)}`,
            action: act("cash"),
            cost: cost.total,
            energy: cost.energy,
            expectedHarvestDay: expectedSchedule(state.day, variety.id, data).harvestable,
          },
          credit,
        ),
      );
    }
  }
  return out;
}

/** Field work on a plot with a crop; what is listed follows the fresh `known` (the player is standing there). */
function cropOptions(state: GameState, plot: PlotState, data: GameData): ActionOption[] {
  const known = plot.known;
  const crop = plot.crop;
  if (known === null || crop === null) return [];
  const { crop: c } = data;
  const out: ActionOption[] = [];

  if (known.status === "harvestable") {
    out.push(
      option(state, data, { id: "harvest:machine", label: "Thuê máy gặt", action: { type: "harvest", plotId: plot.id, method: "machine" }, cost: c.harvest.machineCostPerPlot }),
      option(state, data, { id: "harvest:hand", label: "Gặt tay", action: { type: "harvest", plotId: plot.id, method: "hand" }, energy: c.harvest.handEnergyPerPlot }),
    );
    return out;
  }

  const stage = known.stage;
  const recommended = stage !== null && (c.fertilizer.recommendedStages as readonly string[]).includes(stage);
  const onTime = recommended && !crop.fertilizerApps.some((a) => a.stage === stage);
  const fertilize = (payWith: PayWith): Action => ({ type: "fertilize", plotId: plot.id, payWith });
  out.push(
    option(
      state,
      data,
      { id: "fertilize", label: "Bón phân", detail: onTime ? "Đúng lúc bón" : null, action: fertilize("cash"), cost: c.fertilizer.costPerApp, energy: c.fertilizer.energy },
      creditFor(state, data, fertilize("store_credit"), 0, c.fertilizer.costPerApp),
    ),
  );

  for (const mode of ["cure", "preventive"] as const) {
    for (const pest of data.pests) {
      // Cure only what the player can see (UI_DIRECTION): spraying blind is allowed by the rules, but not offered.
      if (mode === "cure" && (known.signs[pest.id] ?? null) === null) continue;
      const spray = (payWith: PayWith): Action => ({ type: "spray", plotId: plot.id, pest: pest.id, mode, payWith });
      out.push(
        option(
          state,
          data,
          {
            id: `spray:${mode}:${pest.id}`,
            label: `${mode === "cure" ? "Phun thuốc trị" : "Phun phòng"} ${pestName(pest.id, data)}`,
            action: spray("cash"),
            cost: c.spray.costPerApp,
            energy: c.spray.energy,
          },
          creditFor(state, data, spray("store_credit"), 0, c.spray.costPerApp),
        ),
      );
    }
  }

  out.push(
    option(state, data, {
      id: "adjustWater",
      label: "Chỉnh nước (bơm/tháo)",
      action: { type: "adjustWater", plotId: plot.id },
      cost: c.water.adjustCost,
      energy: c.water.adjustEnergy,
    }),
  );
  return out;
}

function plotOptions(state: GameState, plot: PlotState, data: GameData): ActionOption[] {
  if (!inField(state)) {
    return [
      option(state, data, {
        id: "goToField",
        label: "Ra đồng",
        action: { type: "chooseActivity", activity: "field" },
        energy: data.economy.energy.fieldVisit,
      }),
    ];
  }
  // In the field `known` was refreshed this half-day, so it matches the plot (decision B10).
  const status = plot.known?.status ?? plot.status;
  if (status === "empty" || status === "harvested") return sowOptions(state, plot, data);
  return cropOptions(state, plot, data);
}

function houseOptions(state: GameState, data: GameData): ActionOption[] {
  const restored = Math.min(data.economy.energy.max, state.energy + data.economy.energy.restHalfDay) - state.energy;
  return [
    option(state, data, {
      id: "rest",
      label: "Nghỉ ở nhà",
      action: { type: "chooseActivity", activity: "rest" },
      gain: { cash: 0, energy: restored },
      reasonOverride: inField(state) ? IN_FIELD_REASON : null,
    }),
  ];
}

function workSignOptions(state: GameState, data: GameData): ActionOption[] {
  const w = data.economy.hiredWork;
  return [
    option(state, data, {
      id: "hiredWork",
      label: "Đi làm thuê",
      action: { type: "chooseActivity", activity: "hired_work" },
      energy: w.energyCost,
      gain: { cash: w.wageHalfDay, energy: 0 },
      reasonOverride: inField(state) ? IN_FIELD_REASON : null,
    }),
  ];
}

function ledgerOptions(state: GameState, data: GameData): ActionOption[] {
  const out: ActionOption[] = [];
  const f = data.finance;

  for (const loan of state.loans) {
    const max = Math.min(loan.balance, state.cash);
    out.push(
      option(state, data, {
        id: `repay:${loan.id}`,
        label: `Trả ${loanLabel(loan.kind).toLowerCase()}`,
        action: { type: "repay", loanId: loan.id, amount: Math.max(1, max) },
        cost: Math.max(1, max),
        range: { field: "amount", min: 1, max: Math.max(1, max) },
      }),
    );
    if (loan.kind === "loan_shark") {
      out.push(
        option(state, data, {
          id: `rollOver:${loan.id}`,
          label: "Đảo nợ vay nóng",
          detail: `Trả lãi, thêm ${f.loanShark.termDays} ngày`,
          action: { type: "rollOverLoan", loanId: loan.id },
          cost: rollOverCost(loan),
        }),
      );
    }
  }

  const sharkRoom = Math.max(1, f.loanShark.maxTotal - loanSharkPrincipal(state));
  out.push(
    option(state, data, {
      id: "loanShark",
      label: "Vay nóng",
      detail: `Lãi ${Math.round(f.loanShark.interestPer30Days * 100)}%/${f.loanShark.termDays} ngày`,
      action: { type: "takeLoanShark", amount: sharkRoom },
      range: { field: "amount", min: 1, max: sharkRoom },
    }),
  );

  const maxPercent = Math.max(1, Math.floor(f.advanceSale.maxRatioOfExpected * 100 + 1e-9));
  for (const plot of state.plots) {
    if (plot.crop === null || (plot.status !== "growing" && plot.status !== "harvestable")) continue;
    out.push(
      option(state, data, {
        id: `advance:${plot.id}`,
        label: `Bán lúa non thửa ${plot.id + 1}`,
        action: { type: "sellAdvance", plotId: plot.id, ratio: maxPercent / 100 },
        range: { field: "percent", min: 1, max: maxPercent },
      }),
    );
  }

  if (state.loans.some((l) => l.kind === "rent")) {
    out.push(
      option(state, data, {
        id: "rentExtension",
        label: "Xin gia hạn tiền thuê",
        detail: `Hoãn ${f.rentExtension.days} ngày, mất ${f.rentExtension.uyTinCost} uy tín`,
        action: { type: "requestRentExtension" },
      }),
    );
  }

  if (!state.landAccess) {
    out.push(option(state, data, { id: "reRent", label: "Thuê lại ruộng", action: { type: "reRent" }, cost: reRentCost(state, data) }));
  }

  out.push(option(state, data, { id: "quit", label: "Bán hết, lên thành phố", action: { type: "quit" } }));
  return out;
}

function traderOptions(state: GameState, data: GameData): ActionOption[] {
  return state.harvestLots.map((lot) =>
    option(state, data, {
      id: `sell:${lot.id}`,
      label: `Bán lúa thửa ${lot.plotId + 1}`,
      action: { type: "sellLot", lotId: lot.id },
      gain: { cash: lotValue(state, lot, data), energy: 0 },
    }),
  );
}

const DEFAULT_SKIP_DAYS = 7;

function dayOptions(state: GameState, data: GameData): ActionOption[] {
  const out: ActionOption[] = [
    option(state, data, { id: "endHalfDay", label: "Xong việc, về nhà", action: { type: "endHalfDay" } }),
    option(state, data, {
      id: "skip",
      label: "Tua đến khi…",
      action: { type: "skipUntil", defaultActivity: "rest", stopOn: [...ALL_STOP_CONDITIONS], maxDays: DEFAULT_SKIP_DAYS },
      range: { field: "maxDays", min: 1, max: MAX_SKIP_DAYS },
    }),
  ];
  if (state.phase.kind === "settlement") out.push(option(state, data, { id: "acknowledge", label: "Gấp sổ", action: { type: "acknowledge" } }));
  return out;
}

/** Every target's options for this state. Only getPlayerView calls this. */
export function computeActionOptions(state: GameState, data: GameData): Record<string, ActionOption[]> {
  const options: Record<string, ActionOption[]> = {
    house: houseOptions(state, data),
    workSign: workSignOptions(state, data),
    ledger: ledgerOptions(state, data),
    trader: traderOptions(state, data),
    day: dayOptions(state, data),
  };
  for (const plot of state.plots) options[targetKey({ kind: "plot", plotId: plot.id })] = plotOptions(state, plot, data);
  return options;
}

// ---------------------------------------------------------------------------
// Ranged options: terms for a chosen amount (from the view only)
// ---------------------------------------------------------------------------

/**
 * The action and terms for a ranged option at `value` (clamped to its range): how much comes in now,
 * what is owed after and when. Uses the same formulas as the rules.
 */
export function quoteOption(view: PlayerView, opt: ActionOption, value: number, data: GameData): OptionQuote {
  const range = opt.range;
  const v = range === null ? value : Math.min(range.max, Math.max(range.min, Math.round(value)));
  const a = opt.action;
  switch (a.type) {
    case "repay": {
      const loan = view.loans.find((l) => l.id === a.loanId);
      return { action: { ...a, amount: v }, receive: 0, owe: loan ? loan.balance - v : null, dueDay: loan?.dueDay ?? null, kg: null };
    }
    case "takeLoanShark":
      return {
        action: { ...a, amount: v },
        receive: v,
        owe: v + sharkInterest(v, data),
        dueDay: view.day + data.finance.loanShark.termDays,
        kg: null,
      };
    case "sellAdvance": {
      const plot = view.plots.find((p) => p.id === a.plotId);
      const crop = plot?.crop ?? null;
      if (crop === null) return { action: a, receive: 0, owe: null, dueDay: null, kg: null };
      const ratio = v / 100;
      const q = advanceSaleQuote(crop.expectedYieldKg, view.market.varietyPricePerKg[crop.varietyId] ?? 0, ratio, data.finance.advanceSale.priceFactor);
      return { action: { ...a, ratio }, receive: q.amount, owe: null, dueDay: null, kg: q.kg };
    }
    case "skipUntil":
      return { action: { ...a, maxDays: v }, receive: 0, owe: null, dueDay: null, kg: null };
    default:
      return { action: a, receive: 0, owe: null, dueDay: null, kg: null };
  }
}
