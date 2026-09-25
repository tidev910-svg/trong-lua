import type { GameData } from "../../data/schemas";
import type { GameState, HarvestLot, LedgerEntry } from "../types";
import { traderPricePerKg, varietyMarketPrice } from "./market";
import { harvestYieldKg } from "./yield";

export type HarvestMethod = "machine" | "hand";

/**
 * Harvests a harvestable plot (spec §7). Validation (phase, energy, cash) is the action's job.
 * - kg from harvestYieldKg on today's date;
 * - an advance contract on the plot takes its kg first; missing kg are paid in cash at
 *   variety market price × shortfallPenalty (decision B11/B12; cash may go negative, decision A1);
 * - machine: machineCostPerPlot cash; hand: handEnergyPerPlot energy;
 * - the plot becomes "harvested" and the rest becomes a lot waiting to be sold.
 */
export function harvestPlot(state: GameState, plotId: number, method: HarvestMethod, data: GameData): GameState {
  const plot = state.plots.find((p) => p.id === plotId);
  if (!plot || plot.status !== "harvestable" || plot.crop === null) throw new Error(`plot ${plotId} is not harvestable`);
  const crop = plot.crop;
  const day = state.day;
  const ledger: LedgerEntry[] = [...state.ledger];
  let cash = state.cash;
  let energy = state.energy;

  let kg = harvestYieldKg(crop, day, data);

  const contract = state.advanceContracts.find((c) => c.plotId === plotId);
  if (contract) {
    const delivered = Math.min(kg, contract.kg);
    kg -= delivered;
    const shortfallKg = contract.kg - delivered;
    if (shortfallKg > 0) {
      const penalty = Math.round(
        shortfallKg * varietyMarketPrice(state, crop.varietyId, data) * data.finance.advanceSale.shortfallPenalty,
      );
      cash -= penalty;
      ledger.push({ day, amount: -penalty, category: "advance_shortfall", plotId, seasonKey: crop.seasonKey });
    }
  }

  if (method === "machine") {
    const cost = data.crop.harvest.machineCostPerPlot;
    cash -= cost;
    ledger.push({ day, amount: -cost, category: "harvest_machine", plotId, seasonKey: crop.seasonKey });
  } else {
    energy -= data.crop.harvest.handEnergyPerPlot;
  }

  let nextId = state.nextId;
  const lots = [...state.harvestLots];
  if (kg > 0) {
    lots.push({
      id: `lot-${nextId++}`,
      plotId,
      varietyId: crop.varietyId,
      seasonKey: crop.seasonKey,
      kg,
      harvestDay: day,
      nightsWaited: 0,
    });
  }

  return {
    ...state,
    nextId,
    cash,
    energy,
    ledger,
    harvestLots: lots,
    advanceContracts: state.advanceContracts.filter((c) => c.plotId !== plotId),
    plots: state.plots.map((p) => (p.id === plotId ? { ...p, status: "harvested", crop: null } : p)),
  };
}

/** Money for a lot at today's trader price, rounded to VND (decision B16). */
export function lotValue(state: GameState, lot: HarvestLot, data: GameData, priceFactor = 1): number {
  return Math.round(lot.kg * traderPricePerKg(state, lot.varietyId, data) * priceFactor);
}

/**
 * Sells one lot to the trader at today's price. Store-credit repayment and the settlement check
 * run after this in the action layer.
 */
export function sellLot(state: GameState, lotId: string, data: GameData, auto = false): GameState {
  const lot = state.harvestLots.find((l) => l.id === lotId);
  if (!lot) throw new Error(`unknown lot "${lotId}"`);
  const amount = lotValue(state, lot, data);
  return {
    ...state,
    cash: state.cash + amount,
    harvestLots: state.harvestLots.filter((l) => l.id !== lotId),
    ledger: [...state.ledger, { day: state.day, amount, category: "rice_sale", plotId: lot.plotId, seasonKey: lot.seasonKey }],
    log: [...state.log, { day: state.day, kind: "lotSold", lotId, kg: lot.kg, amount, auto }],
  };
}

/**
 * Night step 7 (part): each lot loses freshRiceLossPerDay of its weight; after maxWaitDays nights
 * it is sold automatically at the trader price (decision B11).
 * Returns the ids of auto-sold lots so the caller can run the after-sale steps.
 */
export function ageLots(state: GameState, data: GameData): { state: GameState; autoSold: string[] } {
  const { freshRiceLossPerDay, maxWaitDays } = data.crop.harvest;
  let next: GameState = {
    ...state,
    harvestLots: state.harvestLots.map((l) => ({
      ...l,
      kg: l.kg * (1 - freshRiceLossPerDay),
      nightsWaited: l.nightsWaited + 1,
    })),
  };
  const autoSold = next.harvestLots.filter((l) => l.nightsWaited >= maxWaitDays).map((l) => l.id);
  for (const id of autoSold) next = sellLot(next, id, data, true);
  return { state: next, autoSold };
}
