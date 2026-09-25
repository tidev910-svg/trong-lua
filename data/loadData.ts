import type { z } from "zod";
import { FILE_SCHEMAS, GROWTH_STAGES, type DataFileName, type GameData } from "./schemas";

import economy from "./economy.json";
import calendar from "./calendar.json";
import varieties from "./varieties.json";
import crop from "./crop.json";
import pests from "./pests.json";
import weather from "./weather.json";
import market from "./market.json";
import finance from "./finance.json";

/** Untyped contents of every data file, as read from disk. */
export type RawGameData = Record<DataFileName, unknown>;

export const RAW_DATA: RawGameData = { economy, calendar, varieties, crop, pests, weather, market, finance };

const DATA_FILES = Object.keys(FILE_SCHEMAS) as DataFileName[];

export interface DataIssue {
  /** e.g. "weather.json" */
  file: string;
  /** e.g. "distributionByMonth.1" */
  path: string;
  message: string;
}

export class DataValidationError extends Error {
  readonly issues: readonly DataIssue[];

  constructor(issues: readonly DataIssue[]) {
    const lines = issues.map((i) => `  - ${i.file}${i.path ? ` › ${i.path}` : ""}: ${i.message}`);
    super(`Invalid game data (${issues.length} issue${issues.length === 1 ? "" : "s"}):\n${lines.join("\n")}`);
    this.name = "DataValidationError";
    this.issues = issues;
  }
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.map((p) => (typeof p === "number" ? `[${p}]` : String(p))).join(".").replace(/\.\[/g, "[");
}

function zodIssues(file: DataFileName, error: z.ZodError): DataIssue[] {
  return error.issues.map((issue) => ({ file: `${file}.json`, path: formatPath(issue.path), message: issue.message }));
}

/** Checks that span more than one file. Only runs when every file passed its own schema. */
function crossFileIssues(data: GameData): DataIssue[] {
  const issues: DataIssue[] = [];
  const add = (file: DataFileName, path: string, message: string) => issues.push({ file: `${file}.json`, path, message });

  const { economy, calendar, crop, market } = data;
  const lastDay = calendar.daysInYear - 1;

  // Unique ids
  const duplicates = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of duplicates(data.varieties.map((v) => v.id))) add("varieties", "", `duplicate variety id "${id}"`);
  for (const id of duplicates(data.pests.map((p) => p.id))) add("pests", "", `duplicate pest id "${id}"`);

  // Every variety lists a susceptibility for exactly the pests in pests.json
  const pestIds = data.pests.map((p) => p.id);
  data.varieties.forEach((v, i) => {
    const keys = Object.keys(v.pestSusceptibility);
    for (const id of pestIds) {
      if (!keys.includes(id)) add("varieties", `[${i}].pestSusceptibility`, `missing pest "${id}" (from pests.json)`);
    }
    for (const key of keys) {
      if (!pestIds.includes(key)) add("varieties", `[${i}].pestSusceptibility.${key}`, `unknown pest id "${key}"`);
    }
  });

  // Variety must be long enough to hold germination + fixed reproductive stages
  const fixedDays = crop.germinationDays + crop.stageDays.panicle + crop.stageDays.flowering + crop.stageDays.ripening;
  data.varieties.forEach((v, i) => {
    if (v.baseDurationDays <= fixedDays) {
      add(
        "varieties",
        `[${i}].baseDurationDays`,
        `must be > ${fixedDays} (germination + panicle + flowering + ripening in crop.json), got ${v.baseDurationDays}`,
      );
    }
  });

  // Recommended fertilizer stages must be real growth stages (schema enforces) and distinct
  if (new Set(crop.fertilizer.recommendedStages).size !== crop.fertilizer.recommendedStages.length) {
    add("crop", "fertilizer.recommendedStages", "stages must be distinct");
  }
  if (crop.fertilizer.recommendedStages.length !== 2) {
    add("crop", "fertilizer.recommendedStages", `nutrientFactorByCorrectApps covers 0–2 correct apps, so exactly 2 stages are expected (${GROWTH_STAGES.join(", ")})`);
  }

  // Rent installments
  const rentSum = economy.rentInstallments.reduce((s, r) => s + r.amount, 0);
  if (rentSum !== economy.rentPerYear) {
    add("economy", "rentInstallments", `amounts sum to ${rentSum} but rentPerYear is ${economy.rentPerYear}`);
  }
  economy.rentInstallments.forEach((r, i) => {
    if (r.day > lastDay) add("economy", `rentInstallments[${i}].day`, `must be <= ${lastDay} (calendar.daysInYear - 1)`);
  });
  if (economy.familyLoan.dueDay > lastDay) {
    add("economy", "familyLoan.dueDay", `must be <= ${lastDay} (calendar.daysInYear - 1)`);
  }

  // Market glut windows fit in the year
  market.harvestGlut.windows.forEach((w, i) => {
    if (w.endDay > lastDay) add("market", `harvestGlut.windows[${i}].endDay`, `must be <= ${lastDay} (calendar.daysInYear - 1)`);
  });

  return issues;
}

/**
 * Validates raw file contents and returns typed GameData.
 * Throws DataValidationError listing every problem found (all files are checked, not just the first failure).
 */
export function parseGameData(raw: RawGameData): GameData {
  const issues: DataIssue[] = [];
  const parsed: Partial<Record<DataFileName, unknown>> = {};

  for (const file of DATA_FILES) {
    const result = FILE_SCHEMAS[file].safeParse(raw[file]);
    if (result.success) parsed[file] = result.data;
    else issues.push(...zodIssues(file, result.error));
  }
  if (issues.length > 0) throw new DataValidationError(issues);

  // Every file matched its schema, so parsed has the GameData shape.
  const data = parsed as GameData;
  const crossIssues = crossFileIssues(data);
  if (crossIssues.length > 0) throw new DataValidationError(crossIssues);

  return data;
}

let cached: GameData | undefined;

/** Loads and validates the bundled data/*.json. Result is cached. */
export function loadData(): GameData {
  cached ??= parseGameData(RAW_DATA);
  return cached;
}
