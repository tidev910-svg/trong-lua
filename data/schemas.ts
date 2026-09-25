import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared enums (code switches on these, so they are fixed here, not in data)
// ---------------------------------------------------------------------------

export const MONTH_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export const WEATHER_STATES = ["sunny", "cloudy", "rain", "heavy_rain", "storm"] as const;
export const GROWTH_STAGES = ["germination", "tillering", "panicle", "flowering", "ripening"] as const;
export const SEASON_IDS = ["DX", "HT", "TD"] as const;
export const SOWING_METHODS = ["broadcast", "transplant"] as const;

export const PROBABILITY_SUM_TOLERANCE = 1e-6;

/** Solar calendar without leap years (DATA_SPEC: calendar.json). Index 0 = January. */
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const monthKey = z.enum(MONTH_KEYS);
const weatherState = z.enum(WEATHER_STATES);
const growthStage = z.enum(GROWTH_STAGES);
const seasonId = z.enum(SEASON_IDS);
const sowingMethod = z.enum(SOWING_METHODS);

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Money in VND: non-negative integer. */
const money = z.number().int().nonnegative();
/** Day index (day 0 = game start). */
const day = z.number().int().nonnegative();
const probability = z.number().min(0).max(1);
const positive = z.number().positive();
const nonNegative = z.number().nonnegative();
const nonNegativeInt = z.number().int().nonnegative();
const month = z.number().int().min(1).max(12);

/** Exhaustive map "1".."12" → value (Zod 4 records with enum keys require every key). */
const byMonth = <T extends z.ZodType>(value: T) => z.record(monthKey, value);

const byWeather = <T extends z.ZodType>(value: T) => z.record(weatherState, value);

const byStage = <T extends z.ZodType>(value: T) => z.record(growthStage, value);

function sumsToOne(values: Record<string, number>): boolean {
  const sum = Object.values(values).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) <= PROBABILITY_SUM_TOLERANCE;
}

/** A probability distribution over weather states; must sum to 1. */
const weatherDistribution = byWeather(probability).check((ctx) => {
  if (!sumsToOne(ctx.value)) {
    const sum = Object.values(ctx.value).reduce((a, b) => a + b, 0);
    ctx.issues.push({
      code: "custom",
      input: ctx.value,
      message: `probabilities must sum to 1 (got ${sum})`,
    });
  }
});

const minMaxRange = (value: z.ZodNumber) =>
  z.tuple([value, value]).refine((range) => range[0] <= range[1], {
    message: "range must be [min, max] with min <= max",
  });

// ---------------------------------------------------------------------------
// economy.json
// ---------------------------------------------------------------------------

export const EconomySchema = z.strictObject({
  plotCount: z.number().int().positive(),
  plotAreaM2: positive,
  startCash: money,
  familyLoan: z.strictObject({
    amount: money,
    dueDay: day,
    latePenaltyUyTin: nonNegative,
  }),
  rentPerYear: money,
  rentInstallments: z.array(z.strictObject({ day, amount: money })).min(1),
  livingCostPerDay: money,
  startUyTin: z.number().min(0).max(100),
  energy: z.strictObject({
    max: positive,
    nightRestore: nonNegative,
    restHalfDay: nonNegative,
    fieldVisit: nonNegative,
  }),
  hiredWork: z.strictObject({
    wageHalfDay: money,
    energyCost: nonNegative,
    uyTinGain: nonNegative,
    uyTinGainCapPerSeason: nonNegative,
    availabilityByMonth: byMonth(probability),
  }),
});

// ---------------------------------------------------------------------------
// calendar.json
// ---------------------------------------------------------------------------

export const CalendarSchema = z
  .strictObject({
    startMonth: month,
    startDayOfMonth: z.number().int().min(1).max(31),
    daysInYear: z.number().int().positive(),
    tetDay: day,
    tetExtraCost: money,
    seasonBySowingMonth: byMonth(seasonId),
  })
  .refine((c) => c.tetDay < c.daysInYear, { message: "tetDay must be < daysInYear", path: ["tetDay"] })
  .refine((c) => c.startDayOfMonth <= (DAYS_IN_MONTH[c.startMonth - 1] ?? 0), {
    message: "startDayOfMonth does not exist in startMonth (no leap years)",
    path: ["startDayOfMonth"],
  });

// ---------------------------------------------------------------------------
// varieties.json
// ---------------------------------------------------------------------------

export const VarietySchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  note: z.string().optional(),
  baseDurationDays: z.number().int().positive(),
  seedCostPerPlot: money,
  baseYieldKg: z.record(seasonId, nonNegative),
  priceMultiplier: positive,
  /** Keyed by pest id; cross-checked against pests.json in loadData. */
  pestSusceptibility: z.record(z.string(), nonNegative),
  lodgingSusceptibility: nonNegative,
});

export const VarietiesSchema = z.array(VarietySchema).min(1);

// ---------------------------------------------------------------------------
// crop.json
// ---------------------------------------------------------------------------

const SowingMethodParamsSchema = z.strictObject({
  seedMultiplier: positive,
  laborCost: money,
  energy: nonNegative,
  yieldFactor: positive,
  lodgingRisk: nonNegative,
});

export const CropSchema = z.strictObject({
  germinationDays: z.number().int().positive(),
  stageDays: z.strictObject({
    panicle: z.number().int().positive(),
    flowering: z.number().int().positive(),
    ripening: z.number().int().positive(),
  }),
  harvestWindowDays: nonNegativeInt,
  overdueLossPerDay: probability,
  growthRateByMonth: byMonth(positive),
  lowHealthCare: z.strictObject({ threshold: probability, growthFactor: probability }),
  /** What the player sees for health (decision A5): highest band whose min <= health. */
  healthBands: z
    .array(z.strictObject({ min: probability, label: z.string().min(1) }))
    .min(1)
    .refine((bands) => bands.every((b, i) => i === 0 || b.min < (bands[i - 1]?.min ?? Infinity)), {
      message: "bands must be sorted by min, strictly descending",
    })
    .refine((bands) => bands[bands.length - 1]?.min === 0, { message: "last band must have min 0" }),
  water: z
    .strictObject({
      start: z.number().min(0).max(100),
      min: z.number().min(0).max(100),
      max: z.number().min(0).max(100),
      adjustTarget: z.number().min(0).max(100),
      adjustCost: money,
      adjustEnergy: nonNegative,
      deltaByWeather: byWeather(z.number()),
      stressHealthPerDay: probability,
      stressGrowthFactor: probability,
    })
    .refine((w) => w.min <= w.max, { message: "water.min must be <= water.max", path: ["min"] }),
  landPrep: z.strictObject({ costPerPlot: money, energy: nonNegative }),
  sowing: z.record(sowingMethod, SowingMethodParamsSchema),
  fertilizer: z.strictObject({
    costPerApp: money,
    energy: nonNegative,
    recommendedStages: z.array(growthStage).min(1),
    nutrientFactorByCorrectApps: z.record(z.enum(["0", "1", "2"]), positive),
    offStageEfficiency: probability,
  }),
  spray: z.strictObject({ costPerApp: money, energy: nonNegative }),
  harvest: z.strictObject({
    machineCostPerPlot: money,
    handEnergyPerPlot: nonNegative,
    freshRiceLossPerDay: probability,
    maxWaitDays: nonNegativeInt,
  }),
  storm: z.strictObject({
    floweringLossChance: probability,
    floweringHealthLoss: probability,
    lodgingChanceBase: probability,
    lodgingHealthLoss: probability,
  }),
  flood: z.strictObject({
    yearChance: probability,
    windowStartMonth: month,
    windowEndMonth: month,
    warningDaysRange: minMaxRange(z.number().int().nonnegative()),
    warningDayError: minMaxRange(z.number().int()),
    healthLossRange: minMaxRange(probability),
  }),
});

// ---------------------------------------------------------------------------
// pests.json
// ---------------------------------------------------------------------------

export const PestSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    spawnChance: probability,
    /** Density when a pest appears or spreads to a clean plot (decision A4). */
    initialDensity: z.number().gt(0).max(1),
    growthRate: nonNegative,
    weatherFactor: byWeather(nonNegative),
    stageFactor: byStage(nonNegative),
    visibleThreshold: probability,
    damageThreshold: probability,
    damagePerDay: probability,
    spreadThreshold: probability,
    spreadChance: probability,
    sprayEffectiveness: probability,
    preventiveDays: nonNegativeInt,
    preventiveFactor: nonNegative,
    regionalAlert: z.strictObject({
      chancePerDayByMonth: byMonth(probability),
      durationDays: z.number().int().positive(),
      spawnMultiplier: nonNegative,
    }),
    signs: z.strictObject({
      light: z.string().min(1),
      medium: z.string().min(1),
      heavy: z.string().min(1),
    }),
    signLevels: z.strictObject({ medium: probability, heavy: probability }),
  })
  .refine((p) => p.visibleThreshold <= p.signLevels.medium && p.signLevels.medium <= p.signLevels.heavy, {
    message: "sign thresholds must satisfy visibleThreshold <= signLevels.medium <= signLevels.heavy",
    path: ["signLevels"],
  });

export const PestsSchema = z.array(PestSchema).min(1);

// ---------------------------------------------------------------------------
// weather.json
// ---------------------------------------------------------------------------

export const WeatherSchema = z.strictObject({
  states: z
    .array(weatherState)
    .refine((s) => s.length === WEATHER_STATES.length && WEATHER_STATES.every((w) => s.includes(w)), {
      message: `states must list each of ${WEATHER_STATES.join(", ")} exactly once`,
    }),
  persistence: probability,
  distributionByMonth: byMonth(weatherDistribution),
  forecastAccuracy: z.strictObject({ today: probability, plus1: probability, plus2: probability }),
  neighbors: byWeather(z.array(weatherState).min(1)),
});

// ---------------------------------------------------------------------------
// market.json
// ---------------------------------------------------------------------------

export const MarketSchema = z.strictObject({
  basePriceByMonth: byMonth(money),
  dailyVolatility: probability,
  maxDeviation: probability,
  harvestGlut: z.strictObject({
    windows: z.array(
      z
        .strictObject({ startDay: day, endDay: day })
        .refine((w) => w.startDay <= w.endDay, { message: "startDay must be <= endDay" }),
    ),
    priceMultiplier: positive,
  }),
  trader: z.strictObject({ base: nonNegative, uyTinBonus: nonNegative }),
});

// ---------------------------------------------------------------------------
// finance.json
// ---------------------------------------------------------------------------

export const FinanceSchema = z.strictObject({
  storeCredit: z.strictObject({ markup: nonNegative, minUyTin: z.number().min(0).max(100), limit: money }),
  loanShark: z.strictObject({
    maxTotal: money,
    interestPer30Days: nonNegative,
    termDays: z.number().int().positive(),
    minUyTin: z.number().min(0).max(100),
    refuseIfTotalDebtOver: money,
    latePenaltyRate: nonNegative,
  }),
  advanceSale: z.strictObject({
    priceFactor: positive,
    /** Expected yield the trader assumes = baseYield × sowing yieldFactor × this (DATA_SPEC). */
    expectedYieldFactor: positive,
    maxRatioOfExpected: probability,
    shortfallPenalty: positive,
    forcedPriceFactor: positive,
  }),
  rentExtension: z.strictObject({
    days: z.number().int().positive(),
    uyTinCost: nonNegative,
    nextYearRentIncrease: nonNegative,
    maxPerYear: nonNegativeInt,
  }),
  uyTin: z
    .strictObject({ onTimePayment: z.number(), latePenalty: z.number(), min: z.number(), max: z.number() })
    .refine((u) => u.min <= u.max, { message: "uyTin.min must be <= uyTin.max", path: ["min"] }),
  debtSpiral: z.strictObject({
    lateDaysToWarning: nonNegativeInt,
    finalDeadlineDays: nonNegativeInt,
    reRentSurcharge: nonNegative,
  }),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type MonthKey = (typeof MONTH_KEYS)[number];
export type WeatherState = (typeof WEATHER_STATES)[number];
export type GrowthStage = (typeof GROWTH_STAGES)[number];
export type SeasonId = (typeof SEASON_IDS)[number];
export type SowingMethod = (typeof SOWING_METHODS)[number];

export type EconomyData = z.infer<typeof EconomySchema>;
export type CalendarData = z.infer<typeof CalendarSchema>;
export type VarietyData = z.infer<typeof VarietySchema>;
export type CropData = z.infer<typeof CropSchema>;
export type PestData = z.infer<typeof PestSchema>;
export type WeatherData = z.infer<typeof WeatherSchema>;
export type MarketData = z.infer<typeof MarketSchema>;
export type FinanceData = z.infer<typeof FinanceSchema>;

export interface GameData {
  economy: EconomyData;
  calendar: CalendarData;
  varieties: VarietyData[];
  crop: CropData;
  pests: PestData[];
  weather: WeatherData;
  market: MarketData;
  finance: FinanceData;
}

export type DataFileName = keyof GameData;

export const FILE_SCHEMAS = {
  economy: EconomySchema,
  calendar: CalendarSchema,
  varieties: VarietiesSchema,
  crop: CropSchema,
  pests: PestsSchema,
  weather: WeatherSchema,
  market: MarketSchema,
  finance: FinanceSchema,
} as const satisfies Record<DataFileName, z.ZodType>;
