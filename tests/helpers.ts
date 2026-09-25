import { loadData } from "../data/loadData";
import type { GameData } from "../data/schemas";
import { createInitialState } from "../core/init";
import { newCrop } from "../core/systems/yield";
import type { CropState, GameState } from "../core/types";

export const data = loadData();

/** A crop with overrides, sown on day 0 by default. */
export function crop(overrides: Partial<CropState> = {}, gameData: GameData = data): CropState {
  return { ...newCrop(overrides.varietyId ?? "variety_a", overrides.method ?? "broadcast", overrides.sowDay ?? 0, gameData), ...overrides };
}

/** Initial state with the given crops planted (status "growing") on plots by id. */
export function stateWithCrops(crops: Record<number, CropState>, base: GameState = createInitialState(1, data)): GameState {
  return {
    ...base,
    plots: base.plots.map((p) => {
      const c = crops[p.id];
      return c ? { ...p, status: "growing" as const, crop: c } : p;
    }),
  };
}
