import type { GameData } from "../data/schemas";
import { reobservePlot } from "./field";
import { activityRefusal, endHalfDay, slotAwaitingActivity, startActivity } from "./phases";
import { enterSettlementIfDue } from "./settlement";
import { MAX_SKIP_DAYS, runSkip } from "./skip";
import { reRent, reRentRefusal } from "./systems/debt";
import {
  advanceSaleRefusal,
  loanSharkRefusal,
  payCost,
  rentExtensionRefusal,
  repayLoan,
  repayRefusal,
  repayStoreCreditFromSale,
  requestRentExtension,
  rollOverLoan,
  rollOverRefusal,
  sellAdvance,
  settleNegativeCash,
  storeCreditRefusal,
  takeLoanShark,
} from "./systems/finance";
import { harvestPlot, sellLot } from "./systems/harvest";
import { findPest, sprayCure, sprayPreventive } from "./systems/pests";
import { adjustedWater } from "./systems/water";
import { applyFertilizer, newCrop, sowingCost } from "./systems/yield";
import type { Action, ActionResult, CropState, GameState, PayWith, PlotState } from "./types";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FIELD_ACTIONS = new Set<Action["type"]>(["prepareAndSow", "fertilize", "spray", "adjustWater", "harvest", "endHalfDay"]);
const FREE_ACTIONS = new Set<Action["type"]>([
  "sellLot",
  "takeLoanShark",
  "rollOverLoan",
  "repay",
  "sellAdvance",
  "requestRentExtension",
  "reRent",
  "quit",
]);

function plotById(state: GameState, plotId: number): PlotState | undefined {
  return state.plots.find((p) => p.id === plotId);
}

/** Money check for a cost paid in cash or on store credit. */
function paymentRefusal(state: GameState, amount: number, payWith: PayWith, data: GameData): string | null {
  if (payWith === "store_credit") return storeCreditRefusal(state, amount, data);
  return state.cash < amount ? "Không đủ tiền mặt." : null;
}

function energyRefusal(state: GameState, energy: number): string | null {
  return state.energy < energy ? "Không đủ sức lực." : null;
}

function growingPlotRefusal(plot: PlotState | undefined): string | null {
  return plot && plot.status === "growing" && plot.crop !== null ? null : "Thửa này không có lúa đang trồng.";
}

function phaseRefusal(state: GameState, action: Action): string | null {
  const phase = state.phase;
  if (phase.kind === "gameOver") return "Lượt chơi đã kết thúc.";
  if (phase.kind === "settlement") return action.type === "acknowledge" ? null : "Xem xong bảng tính sổ trước đã.";
  if (action.type === "acknowledge") return "Không có gì để xác nhận.";
  if (action.type === "chooseActivity") return slotAwaitingActivity(state) === null ? "Bây giờ không chọn việc được." : null;
  if (action.type === "skipUntil") return phase.kind === "briefing" ? null : "Chỉ tua được từ bản tin buổi sáng.";
  if (FIELD_ACTIONS.has(action.type)) {
    return phase.kind === "halfDay" && phase.activity === "field" ? null : "Phải đang ở ngoài đồng.";
  }
  if (FREE_ACTIONS.has(action.type)) return null;
  return "Hành động không hợp lệ.";
}

/** Why the action is refused, or null if it is allowed (phase, money, energy, uy tín…). */
export function actionRefusal(state: GameState, action: Action, data: GameData): string | null {
  const phaseReason = phaseRefusal(state, action);
  if (phaseReason !== null) return phaseReason;
  const { crop: cropData } = data;

  switch (action.type) {
    case "chooseActivity":
      return activityRefusal(state, action.activity, data);

    case "prepareAndSow": {
      const plot = plotById(state, action.plotId);
      if (!plot || (plot.status !== "empty" && plot.status !== "harvested")) return "Thửa này chưa trống.";
      if (!state.landAccess) return "Đã mất ruộng.";
      if (!data.varieties.some((v) => v.id === action.variety)) return "Không có giống này.";
      const cost = sowingCost(action.variety, action.method, data);
      const cashNeeded = cost.landPrep + cost.labor + (action.payWith === "cash" ? cost.seed : 0);
      if (state.cash < cashNeeded) return "Không đủ tiền mặt.";
      if (action.payWith === "store_credit") {
        const credit = storeCreditRefusal(state, cost.seed, data);
        if (credit !== null) return credit;
      }
      return energyRefusal(state, cost.energy);
    }

    case "fertilize":
      return (
        growingPlotRefusal(plotById(state, action.plotId)) ??
        energyRefusal(state, cropData.fertilizer.energy) ??
        paymentRefusal(state, cropData.fertilizer.costPerApp, action.payWith, data)
      );

    case "spray":
      if (!data.pests.some((p) => p.id === action.pest)) return "Không có loại sâu bệnh này.";
      return (
        growingPlotRefusal(plotById(state, action.plotId)) ??
        energyRefusal(state, cropData.spray.energy) ??
        paymentRefusal(state, cropData.spray.costPerApp, action.payWith, data)
      );

    case "adjustWater":
      return (
        growingPlotRefusal(plotById(state, action.plotId)) ??
        energyRefusal(state, cropData.water.adjustEnergy) ??
        paymentRefusal(state, cropData.water.adjustCost, "cash", data)
      );

    case "harvest": {
      const plot = plotById(state, action.plotId);
      if (!plot || plot.status !== "harvestable") return "Lúa thửa này chưa gặt được.";
      if (action.method === "hand") return energyRefusal(state, cropData.harvest.handEnergyPerPlot);
      return paymentRefusal(state, cropData.harvest.machineCostPerPlot, "cash", data);
    }

    case "endHalfDay":
      return null;

    case "sellLot":
      return state.harvestLots.some((l) => l.id === action.lotId) ? null : "Không có lô lúa này.";

    case "takeLoanShark":
      return loanSharkRefusal(state, action.amount, data);

    case "rollOverLoan":
      return rollOverRefusal(state, action.loanId);

    case "repay":
      return repayRefusal(state, action.loanId, action.amount);

    case "sellAdvance":
      return advanceSaleRefusal(state, action.plotId, action.ratio, data);

    case "requestRentExtension":
      return rentExtensionRefusal(state, data);

    case "reRent":
      return reRentRefusal(state, data);

    case "skipUntil":
      if (!Number.isInteger(action.maxDays) || action.maxDays < 1 || action.maxDays > MAX_SKIP_DAYS) return "Số ngày tua không hợp lệ.";
      return null;

    case "acknowledge":
    case "quit":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Effects (only called once validated)
// ---------------------------------------------------------------------------

function updateCrop(state: GameState, plotId: number, fn: (crop: CropState) => CropState): GameState {
  return { ...state, plots: state.plots.map((p) => (p.id === plotId && p.crop !== null ? { ...p, crop: fn(p.crop) } : p)) };
}

function cropOf(state: GameState, plotId: number): CropState {
  const crop = plotById(state, plotId)?.crop;
  if (!crop) throw new Error(`plot ${plotId} has no crop`);
  return crop;
}

function afterSale(state: GameState, data: GameData): GameState {
  return enterSettlementIfDue(repayStoreCreditFromSale(state, data), state.phase);
}

function perform(state: GameState, action: Action, data: GameData): GameState {
  const { crop: cropData } = data;
  switch (action.type) {
    case "chooseActivity":
      return startActivity(state, action.activity, data);

    case "prepareAndSow": {
      const cost = sowingCost(action.variety, action.method, data);
      const crop = newCrop(action.variety, action.method, state.day, data);
      const tag = { plotId: action.plotId, seasonKey: crop.seasonKey };
      let s = payCost(state, cost.seed, action.payWith, { category: "seed", ...tag }, data);
      s = payCost(s, cost.landPrep, "cash", { category: "land_prep", ...tag }, data);
      if (cost.labor > 0) s = payCost(s, cost.labor, "cash", { category: "labor", ...tag }, data);
      s = {
        ...s,
        energy: s.energy - cost.energy,
        plots: s.plots.map((p) => (p.id === action.plotId ? { ...p, status: "growing", crop } : p)),
      };
      return reobservePlot(s, action.plotId, data);
    }

    case "fertilize": {
      const crop = cropOf(state, action.plotId);
      let s = payCost(state, cropData.fertilizer.costPerApp, action.payWith, { category: "fertilizer", plotId: action.plotId, seasonKey: crop.seasonKey }, data);
      s = updateCrop({ ...s, energy: s.energy - cropData.fertilizer.energy }, action.plotId, (c) => applyFertilizer(c, state.day, data));
      return reobservePlot(s, action.plotId, data);
    }

    case "spray": {
      const crop = cropOf(state, action.plotId);
      findPest(action.pest, data);
      let s = payCost(state, cropData.spray.costPerApp, action.payWith, { category: "spray", plotId: action.plotId, seasonKey: crop.seasonKey }, data);
      s = updateCrop({ ...s, energy: s.energy - cropData.spray.energy }, action.plotId, (c) => {
        const sprayed = action.mode === "cure" ? sprayCure(c, action.pest, data) : sprayPreventive(c, action.pest, state.day, data);
        return { ...sprayed, sprayLog: [...sprayed.sprayLog, { day: state.day, pestId: action.pest, mode: action.mode }] };
      });
      return reobservePlot(s, action.plotId, data);
    }

    case "adjustWater": {
      const crop = cropOf(state, action.plotId);
      let s = payCost(state, cropData.water.adjustCost, "cash", { category: "water", plotId: action.plotId, seasonKey: crop.seasonKey }, data);
      s = updateCrop({ ...s, energy: s.energy - cropData.water.adjustEnergy }, action.plotId, (c) => ({ ...c, water: adjustedWater(data) }));
      return reobservePlot(s, action.plotId, data);
    }

    case "harvest": {
      const s = reobservePlot(harvestPlot(state, action.plotId, action.method, data), action.plotId, data);
      return enterSettlementIfDue(s, state.phase);
    }

    case "endHalfDay":
      return endHalfDay(state, data);

    case "sellLot":
      return afterSale(sellLot(state, action.lotId, data), data);

    case "takeLoanShark":
      return takeLoanShark(state, action.amount, data);

    case "rollOverLoan":
      return rollOverLoan(state, action.loanId, data);

    case "repay":
      return repayLoan(state, action.loanId, action.amount, data);

    case "sellAdvance":
      return sellAdvance(state, action.plotId, action.ratio, data);

    case "requestRentExtension":
      return requestRentExtension(state, data);

    case "reRent":
      return reRent(state, data);

    case "skipUntil": {
      const { state: s, stoppedBy, days, earned } = runSkip(state, action.defaultActivity, action.stopOn, action.maxDays, data);
      return { ...s, log: [...s.log, { day: s.day, kind: "skipStopped", reason: stoppedBy, days, earned }] };
    }

    case "acknowledge": {
      if (state.phase.kind !== "settlement") return state;
      const { seasonKey, resume } = state.phase;
      const settled: GameState = {
        ...state,
        phase: resume,
        settledSeasons: [...state.settledSeasons, seasonKey],
        stats: { ...state.stats, seasonsCompleted: state.stats.seasonsCompleted + 1 },
      };
      return enterSettlementIfDue(settled, resume);
    }

    case "quit": {
      // "Bán hết, lên thành phố": sell every lot, then the run ends.
      let s = state;
      for (const lot of state.harvestLots) s = sellLot(s, lot.id, data);
      s = repayStoreCreditFromSale(s, data);
      return { ...s, phase: { kind: "gameOver", reason: "quit" } };
    }
  }
}

/**
 * The single entry point for changing the game (ARCHITECTURE, decision A15). Refused actions return the
 * unchanged state with a reason in Vietnamese; accepted ones never leave cash negative (decision A1).
 */
export function applyAction(state: GameState, action: Action, data: GameData): ActionResult {
  const reason = actionRefusal(state, action, data);
  if (reason !== null) return { ok: false, state, reason };
  let next = settleNegativeCash(perform(state, action, data));
  next = { ...next, stats: { ...next.stats, peakCash: Math.max(next.stats.peakCash, next.cash) } };
  return { ok: true, state: next };
}
