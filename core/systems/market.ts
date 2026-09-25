import type { GameData } from "../../data/schemas";
import type { Rng } from "../rng";
import type { GameState } from "../types";
import { monthKeyOfDay } from "./calendar";
import { findVariety } from "./growth";

export function isHarvestGlut(day: number, data: GameData): boolean {
  return data.market.harvestGlut.windows.some((w) => w.startDay <= day && day <= w.endDay);
}

/** VND/kg (spec §7, DATA_SPEC market.json): basePriceByMonth × (1 + deviation) × glut multiplier. Not rounded. */
export function marketPrice(state: GameState, data: GameData): number {
  const base = data.market.basePriceByMonth[monthKeyOfDay(state.day, data.calendar)];
  const glut = isHarvestGlut(state.day, data) ? data.market.harvestGlut.priceMultiplier : 1;
  return base * (1 + state.market.deviation) * glut;
}

/** Market price of a variety: marketPrice × variety.priceMultiplier. */
export function varietyMarketPrice(state: GameState, varietyId: string, data: GameData): number {
  return marketPrice(state, data) * findVariety(varietyId, data).priceMultiplier;
}

/** What the trader pays per kg (spec §7): variety market price × (trader.base + trader.uyTinBonus × uyTin / 100). */
export function traderPricePerKg(state: GameState, varietyId: string, data: GameData): number {
  const { base, uyTinBonus } = data.market.trader;
  return varietyMarketPrice(state, varietyId, data) * (base + (uyTinBonus * state.uyTin) / 100);
}

/**
 * New day's deviation (decision B4): deviation + uniform(−dailyVolatility, +dailyVolatility),
 * clamped to ±maxDeviation. One draw. Runs when the day advances (night step 9).
 */
export function updateMarket(state: GameState, data: GameData, rng: Rng): GameState {
  const { dailyVolatility, maxDeviation } = data.market;
  const step = (rng.nextFloat() * 2 - 1) * dailyVolatility;
  const deviation = Math.min(maxDeviation, Math.max(-maxDeviation, state.market.deviation + step));
  return { ...state, market: { deviation } };
}
