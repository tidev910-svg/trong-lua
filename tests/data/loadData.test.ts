import { describe, expect, it } from "vitest";
import { DataValidationError, loadData, parseGameData, RAW_DATA, type RawGameData } from "../../data/loadData";

/** Deep copy of the real data so tests can break it on purpose. */
function rawCopy(): RawGameData {
  return structuredClone(RAW_DATA);
}

type Container = Record<string, unknown> | unknown[];
const isContainer = (v: unknown): v is Container => typeof v === "object" && v !== null;

/** Walks "file.a.b.0" and returns the parent container plus the last key. */
function locate(raw: RawGameData, path: string): [Container, string] {
  const keys = path.split(".");
  const last = keys.pop();
  let node: unknown = raw;
  for (const key of keys) {
    if (!isContainer(node)) throw new Error(`bad test path ${path}`);
    node = (node as Record<string, unknown>)[key];
  }
  if (!isContainer(node) || last === undefined) throw new Error(`bad test path ${path}`);
  return [node, last];
}

function set(raw: RawGameData, path: string, value: unknown): void {
  const [parent, key] = locate(raw, path);
  (parent as Record<string, unknown>)[key] = value;
}

function unset(raw: RawGameData, path: string): void {
  const [parent, key] = locate(raw, path);
  delete (parent as Record<string, unknown>)[key];
}

function expectIssue(raw: RawGameData, file: string, path: string, messagePart: string | RegExp) {
  let caught: unknown;
  try {
    parseGameData(raw);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(DataValidationError);
  const issues = (caught as DataValidationError).issues;
  const match = issues.find((i) => i.file === file && i.path === path);
  expect(match, `expected an issue at ${file} › ${path}, got:\n${(caught as Error).message}`).toBeDefined();
  expect(match?.message).toMatch(messagePart);
  // The thrown message names the file and path so it is readable in a console.
  expect((caught as Error).message).toContain(`${file} › ${path}`);
}

describe("loadData", () => {
  it("loads the bundled data with values from DATA_SPEC", () => {
    const data = loadData();
    expect(data.economy.plotCount).toBe(5);
    expect(data.economy.startCash).toBe(3_000_000);
    expect(data.calendar.tetDay).toBe(80);
    expect(data.varieties.map((v) => v.id)).toEqual(["variety_a", "variety_b"]);
    expect(data.pests.map((p) => p.id)).toEqual(["brown_planthopper", "rice_blast"]);
    expect(data.weather.distributionByMonth["9"].storm).toBe(0.04);
    expect(data.crop.sowing.transplant.yieldFactor).toBe(1.05);
    expect(data.finance.loanShark.interestPer30Days).toBe(0.1);
    // Decided 26/09/2026 (PROTOTYPE_SPEC §14)
    expect([data.crop.water.min, data.crop.water.max]).toEqual([30, 80]);
    expect(data.pests.map((p) => p.initialDensity)).toEqual([0.02, 0.02]);
    expect(data.crop.healthBands.map((b) => b.label)).toEqual(["Tốt", "Khá", "Yếu", "Kém"]);
  });

  it("returns the same object on repeated calls", () => {
    expect(loadData()).toBe(loadData());
  });
});

describe("parseGameData rejects broken data with a clear message", () => {
  it("weather distribution that does not sum to 1", () => {
    const raw = rawCopy();
    set(raw, "weather.distributionByMonth.7.sunny", 0.5);
    expectIssue(raw, "weather.json", "distributionByMonth.7", /sum to 1 \(got 1\.25/);
  });

  it("missing required field", () => {
    const raw = rawCopy();
    unset(raw, "economy.livingCostPerDay");
    expectIssue(raw, "economy.json", "livingCostPerDay", /expected number/i);
  });

  it("wrong type", () => {
    const raw = rawCopy();
    set(raw, "crop.fertilizer.costPerApp", "350000");
    expectIssue(raw, "crop.json", "fertilizer.costPerApp", /expected number/i);
  });

  it("non-integer money", () => {
    const raw = rawCopy();
    set(raw, "market.basePriceByMonth.3", 7800.5);
    expectIssue(raw, "market.json", "basePriceByMonth.3", /int/i);
  });

  it("probability out of range", () => {
    const raw = rawCopy();
    set(raw, "pests.1.spawnChance", 1.5);
    expectIssue(raw, "pests.json", "[1].spawnChance", /<=\s*1/);
  });

  it("missing month key", () => {
    const raw = rawCopy();
    unset(raw, "crop.growthRateByMonth.12");
    expectIssue(raw, "crop.json", "growthRateByMonth.12", /expected number/i);
  });

  it("misspelled key is not silently ignored", () => {
    const raw = rawCopy();
    set(raw, "finance.storeCredit.minUytin", 30);
    expectIssue(raw, "finance.json", "storeCredit", /unrecognized key.*minUytin/i);
  });

  it("unknown weather state", () => {
    const raw = rawCopy();
    set(raw, "weather.neighbors.sunny", ["fog"]);
    expectIssue(raw, "weather.json", "neighbors.sunny[0]", /invalid option/i);
  });

  it("variety susceptibility that does not match pests.json", () => {
    const raw = rawCopy();
    set(raw, "pests.0.id", "stem_borer");
    expectIssue(raw, "varieties.json", "[0].pestSusceptibility", /missing pest "stem_borer"/);
    expectIssue(raw, "varieties.json", "[0].pestSusceptibility.brown_planthopper", /unknown pest id/);
  });

  it("rent installments that do not add up to rentPerYear", () => {
    const raw = rawCopy();
    set(raw, "economy.rentInstallments.1.amount", 4_000_000);
    expectIssue(raw, "economy.json", "rentInstallments", /sum to 9000000 but rentPerYear is 10000000/);
  });

  it("variety shorter than the fixed stages", () => {
    const raw = rawCopy();
    set(raw, "varieties.0.baseDurationDays", 60);
    expectIssue(raw, "varieties.json", "[0].baseDurationDays", /must be > 67/);
  });

  it("health bands out of order", () => {
    const raw = rawCopy();
    set(raw, "crop.healthBands.1.min", 0.9);
    expectIssue(raw, "crop.json", "healthBands", /strictly descending/);
  });

  it("health bands that do not reach 0", () => {
    const raw = rawCopy();
    set(raw, "crop.healthBands.3.min", 0.1);
    expectIssue(raw, "crop.json", "healthBands", /last band must have min 0/);
  });

  it("zero initial pest density", () => {
    const raw = rawCopy();
    set(raw, "pests.0.initialDensity", 0);
    expectIssue(raw, "pests.json", "[0].initialDensity", />s*0/);
  });

  it("calendar start date that does not exist", () => {
    const raw = rawCopy();
    set(raw, "calendar.startMonth", 2);
    set(raw, "calendar.startDayOfMonth", 29);
    expectIssue(raw, "calendar.json", "startDayOfMonth", /does not exist in startMonth/);
  });

  it("reports problems in several files at once", () => {
    const raw = rawCopy();
    set(raw, "economy.startCash", -1);
    set(raw, "market.dailyVolatility", "high");
    try {
      parseGameData(raw);
      expect.fail("should have thrown");
    } catch (error) {
      const files = (error as DataValidationError).issues.map((i) => i.file);
      expect(files).toContain("economy.json");
      expect(files).toContain("market.json");
    }
  });
});
