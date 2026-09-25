import { allDebt } from "./systems/finance";
import type { GameState, LedgerCategory, LedgerEntry, Phase } from "./types";

const SUPPLY: readonly LedgerCategory[] = ["seed", "fertilizer", "spray"];
const FARM_WORK: readonly LedgerCategory[] = ["land_prep", "labor", "water", "harvest_machine"];

export interface PlotRevenue {
  plotId: number;
  riceSales: number;
  advanceSales: number;
  shortfall: number;
}

/** One season's accounts for the "Tính sổ" screen (spec §11, decision A14). All VND. */
export interface Settlement {
  seasonKey: string;
  startDay: number;
  endDay: number;
  plots: PlotRevenue[];
  revenue: number;
  supplies: number;
  farmWork: number;
  interest: number;
  livingCost: number;
  tetCost: number;
  debtRepaid: number;
  debtRemaining: number;
  cashNow: number;
  /** "Vụ này: lời/lỗ X" = revenue − supplies − farm work − interest − living − Tết. */
  profit: number;
  /** True when another season overlaps this date range, so shared costs are also counted there. */
  overlapsOtherSeason: boolean;
}

function sum(entries: readonly LedgerEntry[]): number {
  return entries.reduce((s, e) => s + e.amount, 0);
}

/** Money spent (positive) from outgoing entries; avoids -0 for empty lists. */
function spent(entries: readonly LedgerEntry[]): number {
  return 0 - sum(entries);
}

/** Seasons that had at least one crop sown. */
function sownSeasons(state: GameState): string[] {
  const keys = state.ledger.filter((e) => e.category === "seed" && e.seasonKey !== undefined).map((e) => e.seasonKey as string);
  return [...new Set(keys)];
}

/** Every crop of the season is out of the ground and every lot is sold. */
export function isSeasonComplete(state: GameState, seasonKey: string): boolean {
  if (state.plots.some((p) => p.crop?.seasonKey === seasonKey)) return false;
  return !state.harvestLots.some((l) => l.seasonKey === seasonKey);
}

/** First season that is complete but not settled yet, or null. */
export function pendingSettlement(state: GameState): string | null {
  return sownSeasons(state).find((k) => !state.settledSeasons.includes(k) && isSeasonComplete(state, k)) ?? null;
}

/** Switches to the settlement screen if a season just finished; `resume` is where play continues. */
export function enterSettlementIfDue(state: GameState, resume: Phase): GameState {
  if (state.phase.kind === "gameOver") return state;
  const seasonKey = pendingSettlement(state);
  return seasonKey === null ? state : { ...state, phase: { kind: "settlement", seasonKey, resume } };
}

function seasonRange(state: GameState, seasonKey: string): { startDay: number; endDay: number } {
  const own = state.ledger.filter((e) => e.seasonKey === seasonKey);
  const startDay = Math.min(...own.filter((e) => e.category === "seed").map((e) => e.day));
  const sales = own.filter((e) => e.category === "rice_sale").map((e) => e.day);
  return { startDay, endDay: sales.length > 0 ? Math.max(...sales) : state.day };
}

export function computeSettlement(state: GameState, seasonKey: string): Settlement {
  const own = state.ledger.filter((e) => e.seasonKey === seasonKey);
  const { startDay, endDay } = seasonRange(state, seasonKey);
  const inRange = state.ledger.filter((e) => e.day >= startDay && e.day <= endDay);
  const of = (entries: readonly LedgerEntry[], cats: readonly LedgerCategory[]) => entries.filter((e) => cats.includes(e.category));

  const plotIds = [...new Set(own.filter((e) => e.plotId !== undefined).map((e) => e.plotId as number))].sort((a, b) => a - b);
  const plots = plotIds.map((plotId) => {
    const mine = own.filter((e) => e.plotId === plotId);
    return {
      plotId,
      riceSales: sum(of(mine, ["rice_sale"])),
      advanceSales: sum(of(mine, ["advance_sale"])),
      shortfall: spent(of(mine, ["advance_shortfall"])),
    };
  });

  const revenue = plots.reduce((s, p) => s + p.riceSales + p.advanceSales - p.shortfall, 0);
  const supplies = spent(of(own, SUPPLY));
  const farmWork = spent(of(own, FARM_WORK));
  const interest = spent(of(inRange, ["interest"]));
  const livingCost = spent(of(inRange, ["living"]));
  const tetCost = spent(of(inRange, ["tet"]));
  const debtRepaid = spent(of(inRange, ["loan_repayment"]));
  const overlapsOtherSeason = sownSeasons(state).some((k) => {
    if (k === seasonKey) return false;
    const r = seasonRange(state, k);
    return r.startDay <= endDay && startDay <= r.endDay;
  });

  return {
    seasonKey,
    startDay,
    endDay,
    plots,
    revenue,
    supplies,
    farmWork,
    interest,
    livingCost,
    tetCost,
    debtRepaid,
    debtRemaining: allDebt(state),
    cashNow: state.cash,
    profit: revenue - supplies - farmWork - interest - livingCost - tetCost,
    overlapsOtherSeason,
  };
}
