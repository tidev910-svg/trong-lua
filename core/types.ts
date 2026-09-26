import type { GrowthStage, SowingMethod, WeatherState } from "../data/schemas";
import type { SignLevel } from "./systems/pests";
import type { StopReason } from "./skip";
import type { WaterLevel } from "./systems/water";

/**
 * Game state types. The shape grows task by task (weather queue in M1.5,
 * pests in M1.7, market/lots in M1.9, …); only what already has rules lives here.
 * Everything must stay plain JSON: no classes, Maps, Dates or undefined-vs-missing tricks.
 */

/** Bump when GameState changes shape in a way that breaks existing saves. */
export const STATE_VERSION = 1;

export type HalfDay = "morning" | "afternoon";

export type Phase =
  | { kind: "briefing" }
  /** A half-day in progress. activity is null until the player picks one (decision B1). */
  | { kind: "halfDay"; slot: HalfDay; activity: "field" | null }
  /** Season settlement screen; `resume` is where play continues after "acknowledge". */
  | { kind: "settlement"; seasonKey: string; resume: Phase }
  | { kind: "gameOver"; reason: "yearEnd" | "bankrupt" | "quit" };

/** A forecast line shown in the morning briefing. */
export interface Forecast {
  day: number;
  predicted: WeatherState;
  /** Chance the forecast is right (forecastAccuracy.today / plus1 / plus2), shown as "độ tin cậy". */
  accuracy: number;
}

/** Decision A2: true weather is fixed 3 days ahead; forecasts are re-rolled every morning. */
export interface WeatherInfo {
  /** True weather for [day, day + 1, day + 2]. Hidden from the player. */
  queue: [WeatherState, WeatherState, WeatherState];
  /** Forecasts for [day, day + 1, day + 2]. */
  forecast: [Forecast, Forecast, Forecast];
  /** Weather that actually happened on the last simulated day (null on day 0). */
  realized: WeatherState | null;
}

export type PlotStatus = "empty" | "growing" | "harvestable" | "harvested";

export type CropStage = GrowthStage | "harvestable";

export interface FertilizerApp {
  day: number;
  stage: GrowthStage;
  /** First application in a recommended stage (decision B7). */
  correct: boolean;
}

/** A crop in the ground. */
export interface CropState {
  varietyId: string;
  method: SowingMethod;
  sowDay: number;
  /** Accumulated growth days (real number, spec §4). */
  growth: number;
  health: number;
  water: number;
  fertilizerApps: FertilizerApp[];
  /** First morning the crop could be harvested; null while still growing. */
  harvestableDay: number | null;
  /** Season this crop belongs to, from its sowing day (e.g. "DX-1"). */
  seasonKey: string;
  /** Pest density 0–1 by pest id (hidden from the player). */
  pests: Record<string, number>;
  /** Last day a preventive spray still works, by pest id. */
  preventiveUntil: Record<string, number>;
  /** Lodged once already this crop (decision A6: at most once). Hidden. */
  lodged: boolean;
  /** The player's own sprays on this crop (public: the player knows what they did). */
  sprayLog: { day: number; pestId: string; mode: "cure" | "preventive" }[];
}

/** The year's flood, decided at game start (decision B5). day is hidden; the warning is public from warningDay. */
export interface FloodPlan {
  day: number | null;
  warningDay: number | null;
  /** Day the radio announces (true day + error). */
  predictedDay: number | null;
}

/** Radio pest alert (spec §5 "Cảnh báo vùng"); active on startDay … endDay. Public. */
export interface RegionalAlert {
  pestId: string;
  startDay: number;
  endDay: number;
}

/** What the player saw on their last field visit (spec §3 "Thăm đồng", decision A5). */
export interface KnownPlotInfo {
  lastVisitDay: number;
  status: PlotStatus;
  stage: CropStage | null;
  waterLevel: WaterLevel | null;
  /** Label from crop.healthBands. */
  healthBand: string | null;
  /** Visible pest signs by pest id (null = nothing visible). */
  signs: Record<string, SignLevel | null>;
}

export interface PlotState {
  id: number;
  status: PlotStatus;
  crop: CropState | null;
  known: KnownPlotInfo | null;
}

/** Every payment obligation is a Loan (decision B14). */
export type LoanKind = "family" | "rent" | "store_credit" | "loan_shark" | "household_arrears";

export interface Loan {
  id: string;
  kind: LoanKind;
  /** Amount originally owed, VND. */
  principal: number;
  /** Amount owed now, VND (principal + accrued interest/penalties − repayments). */
  balance: number;
  takenDay: number;
  /** Last day to pay without being late (paid before the night finance step, decision B3). */
  dueDay: number;
  /** First late day (dueDay + 1) once the night of dueDay passed unpaid; null while on time. */
  lateSinceDay: number | null;
  /** Debt spiral stage 2 (decision A10): day the loan passed lateDaysToWarning, and its final deadline. */
  warningDay: number | null;
  finalDeadlineDay: number | null;
}

export type LedgerCategory =
  | "loan_received"
  | "loan_repayment"
  | "rent"
  | "seed"
  | "land_prep"
  | "labor"
  | "fertilizer"
  | "spray"
  | "water"
  | "harvest_machine"
  | "rice_sale"
  | "advance_sale"
  | "advance_shortfall"
  | "living"
  | "tet"
  | "interest"
  | "hired_work";

/**
 * One money movement, for the settlement screen. amount > 0 = in, < 0 = out.
 * cashless entries (bought on store credit, interest accrued) record a cost without moving cash.
 */
export interface LedgerEntry {
  day: number;
  amount: number;
  category: LedgerCategory;
  cashless?: true;
  loanId?: string;
  plotId?: number;
  /** Season key (e.g. "DX-1") for costs and revenue tied to a crop. */
  seasonKey?: string;
}

/** Freshly harvested rice waiting to be sold (spec §7). */
export interface HarvestLot {
  id: string;
  plotId: number;
  varietyId: string;
  seasonKey: string;
  kg: number;
  harvestDay: number;
  nightsWaited: number;
}

/** "Bán lúa non" contract on a growing plot (spec §8). */
export interface AdvanceContract {
  id: string;
  plotId: number;
  day: number;
  kg: number;
  pricePerKg: number;
}

export type GameEvent =
  | { day: number; kind: "gameStarted"; seed: number }
  | { day: number; kind: "floodWarning"; predictedDay: number }
  | { day: number; kind: "flood" }
  | { day: number; kind: "lotSold"; lotId: string; kg: number; amount: number; auto: boolean }
  | { day: number; kind: "loanLate"; loanId: string; loanKind: LoanKind }
  | { day: number; kind: "tet"; amount: number }
  | { day: number; kind: "creditorVisit"; loanId: string; loanKind: LoanKind; finalDeadlineDay: number }
  | { day: number; kind: "foreclosure"; lotsSold: number; plotsSoldAdvance: number; amount: number }
  | { day: number; kind: "landLost" }
  | { day: number; kind: "landReRented"; amount: number }
  | { day: number; kind: "bankrupt" }
  /** Wage from hired work during the skip, in `earned`. */
  | { day: number; kind: "skipStopped"; reason: StopReason; days: number; earned: number }
  // Presentation events (M2.0): the UI plays animations from these; they never drive rules.
  | { day: number; kind: "wentToField"; slot: HalfDay }
  | { day: number; kind: "hiredWorkDone"; slot: HalfDay; wage: number; uyTinGain: number }
  | { day: number; kind: "restDone"; slot: HalfDay; energy: number }
  /** A new day began (after the night); `day` is the new day. */
  | { day: number; kind: "dayStarted" }
  /** One day of a skip ended at the morning of `day`; `earned` = wage from hired work that day. */
  | { day: number; kind: "skipDayPassed"; earned: number };

export interface RunStats {
  peakCash: number;
  /** Largest single loan balance seen. */
  largestDebt: number;
  maxDebtStage: DebtStage;
  /** Times the debt stage rose to >= 2 ("suýt phá sản"). */
  nearBankruptcyCount: number;
  seasonsCompleted: number;
}

export type DebtStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  /** Counter for deterministic ids (loans, lots…). */
  nextId: number;
  day: number;
  phase: Phase;
  energy: number;
  /** VND; may go negative through mandatory costs (decision A1). */
  cash: number;
  uyTin: number;
  weather: WeatherInfo;
  regionalAlerts: RegionalAlert[];
  flood: FloodPlan;
  /** Today's random-walk deviation of the market price (spec §7). */
  market: { deviation: number };
  plots: PlotState[];
  harvestLots: HarvestLot[];
  advanceContracts: AdvanceContract[];
  loans: Loan[];
  /** Is there hired work today (rolled the night before, decision B13)? Public. */
  hiredWorkAvailable: boolean;
  /** uy tín gained from hired work in the current season (capped by uyTinGainCapPerSeason). */
  hiredWorkUyTin: { seasonKey: string; gained: number };
  /** Rent extensions used this year (spec §8 "xin gia hạn"). */
  rentExtensionsUsed: number;
  debtStage: DebtStage;
  landAccess: boolean;
  /** Season keys whose settlement screen has been shown. */
  settledSeasons: string[];
  ledger: LedgerEntry[];
  log: GameEvent[];
  stats: RunStats;
}

// ---------------------------------------------------------------------------
// Actions (the only way state changes; decision A15)
// ---------------------------------------------------------------------------

export type Activity = "field" | "hired_work" | "rest";
export type PayWith = "cash" | "store_credit";

/** Optional skip stop conditions (spec §3). Events that always stop a skip are not listed here. */
export type StopCondition = "severeForecast" | "pestAlert" | "stageChange" | "debtDueSoon";

export const ALL_STOP_CONDITIONS: readonly StopCondition[] = ["severeForecast", "pestAlert", "stageChange", "debtDueSoon"];

export type Action =
  | { type: "chooseActivity"; activity: Activity }
  | { type: "prepareAndSow"; plotId: number; variety: string; method: SowingMethod; payWith: PayWith }
  | { type: "fertilize"; plotId: number; payWith: PayWith }
  | { type: "spray"; plotId: number; pest: string; mode: "cure" | "preventive"; payWith: PayWith }
  | { type: "adjustWater"; plotId: number }
  | { type: "harvest"; plotId: number; method: "machine" | "hand" }
  | { type: "endHalfDay" }
  | { type: "sellLot"; lotId: string }
  | { type: "takeLoanShark"; amount: number }
  | { type: "rollOverLoan"; loanId: string }
  | { type: "repay"; loanId: string; amount: number }
  | { type: "sellAdvance"; plotId: number; ratio: number }
  | { type: "requestRentExtension" }
  | { type: "reRent" }
  | { type: "skipUntil"; defaultActivity: "rest" | "hired_work"; stopOn: StopCondition[]; maxDays: number }
  | { type: "acknowledge" }
  | { type: "quit" };

export type ActionResult = { ok: true; state: GameState } | { ok: false; state: GameState; reason: string };
