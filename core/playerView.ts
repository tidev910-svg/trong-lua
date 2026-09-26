import type { GameData, SowingMethod, WeatherState } from "../data/schemas";
import { computeActionOptions, type ActionOption } from "./actionOptions";
import { computeSettlement, type Settlement } from "./settlement";
import { summarize, type RunSummary } from "./summary";
import { dateOfDay, daysToTet, monthKeyOfDay, seasonKeyOfDay, type CalendarDate } from "./systems/calendar";
import { reRentCost } from "./systems/debt";
import { expectedYieldKg, loanSharkPrincipal, loanSharkRefusal, storeCreditBalance, storeCreditRefusal } from "./systems/finance";
import { expectedSchedule } from "./systems/growth";
import { lotValue } from "./systems/harvest";
import { isHarvestGlut, marketPrice, traderPricePerKg, varietyMarketPrice } from "./systems/market";
import type {
  AdvanceContract,
  CropStage,
  CropState,
  DebtStage,
  FertilizerApp,
  Forecast,
  GameEvent,
  GameState,
  HarvestLot,
  KnownPlotInfo,
  Loan,
  Phase,
  RegionalAlert,
} from "./types";

/** Plot status as the player sees it: a crop's true readiness is only known from the last visit. */
export type VisiblePlotStatus = "empty" | "planted" | "harvested";

export interface PlotView {
  id: number;
  status: VisiblePlotStatus;
  crop: {
    varietyId: string;
    method: SowingMethod;
    sowDay: number;
    seasonKey: string;
    fertilizerApps: FertilizerApp[];
    sprayLog: CropState["sprayLog"];
    /** Public schedule assuming good care (decision A13). */
    expected: Record<CropStage, number>;
    /** Kg the trader would assume for an advance sale. */
    expectedYieldKg: number;
  } | null;
  known: KnownPlotInfo | null;
  /** Days since the player last saw this plot (null = never). */
  staleDays: number | null;
  advanceContract: AdvanceContract | null;
}

export interface LotView extends HarvestLot {
  valueNow: number;
}

export interface PlayerView {
  day: number;
  date: CalendarDate;
  seasonKey: string;
  phase: Phase;
  energy: number;
  energyMax: number;
  cash: number;
  uyTin: number;
  weather: { yesterday: WeatherState | null; forecast: Forecast[] };
  radio: { pestAlerts: RegionalAlert[]; floodWarning: { predictedDay: number } | null };
  hiredWorkAvailable: boolean;
  market: {
    basePricePerKg: number;
    pricePerKg: number;
    glut: boolean;
    /** Market price by variety (advance-sale quotes). */
    varietyPricePerKg: Record<string, number>;
    traderPricePerKg: Record<string, number>;
  };
  /** Last day the player went to the field (null = never). */
  lastFieldVisitDay: number | null;
  /** Days until Tết (0 on the day), null once it has passed. */
  daysToTet: number | null;
  plots: PlotView[];
  lots: LotView[];
  loans: Loan[];
  debtStage: DebtStage;
  landAccess: boolean;
  credit: {
    storeCreditBalance: number;
    storeCreditLimit: number;
    storeCreditOpen: boolean;
    loanSharkPrincipal: number;
    loanSharkMax: number;
    loanSharkOpen: boolean;
    reRentCost: number;
    rentExtensionsUsed: number;
  };
  /** Events of yesterday's night and today, minus hidden ones. */
  recentEvents: GameEvent[];
  settlement: Settlement | null;
  summary: RunSummary | null;
  /** What the player can do now, by target key (read with getActionOptions). */
  actionOptions: Record<string, ActionOption[]>;
}

const PUBLIC_EVENTS = new Set<GameEvent["kind"]>([
  "floodWarning",
  "flood",
  "lotSold",
  "loanLate",
  "tet",
  "creditorVisit",
  "foreclosure",
  "landLost",
  "landReRented",
  "bankrupt",
  "skipStopped",
  "wentToField",
  "hiredWorkDone",
  "restDone",
  "dayStarted",
  "skipDayPassed",
]);

/** Events the player is allowed to see (radio, what they did, what happened to their money). */
export function isPublicEvent(event: GameEvent): boolean {
  return PUBLIC_EVENTS.has(event.kind);
}

/**
 * Everything the player may know (ARCHITECTURE "Thông tin ẩn"): no true weather ahead, no pest densities,
 * no true health, growth or water, no flood date before the radio, no RNG. UI and bots read only this.
 */
export function getPlayerView(state: GameState, data: GameData): PlayerView {
  const day = state.day;
  const floodAnnounced = state.flood.warningDay !== null && state.flood.predictedDay !== null && day >= state.flood.warningDay;

  return {
    day,
    date: dateOfDay(day, data.calendar),
    seasonKey: seasonKeyOfDay(day, data.calendar),
    phase: state.phase,
    energy: state.energy,
    energyMax: data.economy.energy.max,
    cash: state.cash,
    uyTin: state.uyTin,
    weather: { yesterday: state.weather.realized, forecast: [...state.weather.forecast] },
    radio: {
      pestAlerts: state.regionalAlerts.filter((a) => a.startDay <= day && day <= a.endDay),
      floodWarning: floodAnnounced ? { predictedDay: state.flood.predictedDay as number } : null,
    },
    hiredWorkAvailable: state.hiredWorkAvailable,
    market: {
      basePricePerKg: data.market.basePriceByMonth[monthKeyOfDay(day, data.calendar)],
      pricePerKg: marketPrice(state, data),
      glut: isHarvestGlut(day, data),
      varietyPricePerKg: Object.fromEntries(data.varieties.map((v) => [v.id, varietyMarketPrice(state, v.id, data)])),
      traderPricePerKg: Object.fromEntries(data.varieties.map((v) => [v.id, traderPricePerKg(state, v.id, data)])),
    },
    lastFieldVisitDay: lastFieldVisit(state),
    daysToTet: daysToTet(day, data.calendar),
    plots: state.plots.map((plot): PlotView => {
      const crop = plot.crop;
      return {
        id: plot.id,
        status: plot.status === "empty" ? "empty" : plot.status === "harvested" ? "harvested" : "planted",
        crop:
          crop === null
            ? null
            : {
                varietyId: crop.varietyId,
                method: crop.method,
                sowDay: crop.sowDay,
                seasonKey: crop.seasonKey,
                fertilizerApps: crop.fertilizerApps,
                sprayLog: crop.sprayLog,
                expected: expectedSchedule(crop.sowDay, crop.varietyId, data),
                expectedYieldKg: expectedYieldKg(crop.varietyId, crop.method, crop.sowDay, data),
              },
        known: plot.known,
        staleDays: plot.known === null ? null : day - plot.known.lastVisitDay,
        advanceContract: state.advanceContracts.find((c) => c.plotId === plot.id) ?? null,
      };
    }),
    lots: state.harvestLots.map((lot) => ({ ...lot, valueNow: lotValue(state, lot, data) })),
    loans: state.loans,
    debtStage: state.debtStage,
    landAccess: state.landAccess,
    credit: {
      storeCreditBalance: storeCreditBalance(state),
      storeCreditLimit: data.finance.storeCredit.limit,
      storeCreditOpen: storeCreditRefusal(state, 0, data) === null,
      loanSharkPrincipal: loanSharkPrincipal(state),
      loanSharkMax: data.finance.loanShark.maxTotal,
      loanSharkOpen: loanSharkRefusal(state, 1, data) === null,
      reRentCost: reRentCost(state, data),
      rentExtensionsUsed: state.rentExtensionsUsed,
    },
    recentEvents: state.log.filter((e) => isPublicEvent(e) && e.day >= day - 1),
    settlement: state.phase.kind === "settlement" ? computeSettlement(state, state.phase.seasonKey) : null,
    summary: state.phase.kind === "gameOver" ? summarize(state, data) : null,
    actionOptions: computeActionOptions(state, data),
  };
}

function lastFieldVisit(state: GameState): number | null {
  const days = state.plots.flatMap((p) => (p.known === null ? [] : [p.known.lastVisitDay]));
  return days.length === 0 ? null : Math.max(...days);
}
