import type { GameResult } from "./runGame";

/** Linear-interpolated percentile of a sorted list (p in 0–100). */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (rank - lo);
}

export interface BotReport {
  bot: string;
  runs: number;
  /** Not bankrupt and still renting the land at the end of the year. */
  survivalRate: number;
  netWorth: { p10: number; p25: number; p50: number; p75: number; p90: number; mean: number; stdev: number };
  /** Share of runs by highest debt stage reached (index = stage 0–5). */
  maxDebtStage: number[];
  failures: { bankrupt: number; landLost: number };
  /** Median day of bankruptcy among bankrupt runs. */
  medianBankruptDay: number | null;
  meanSeasons: number;
  refusalsPerRun: number;
}

export function buildReport(bot: string, results: readonly GameResult[]): BotReport {
  const runs = results.length;
  const worth = results.map((r) => r.summary.netWorth).sort((a, b) => a - b);
  const mean = worth.reduce((s, v) => s + v, 0) / runs;
  const stdev = Math.sqrt(worth.reduce((s, v) => s + (v - mean) ** 2, 0) / runs);
  const stages = [0, 0, 0, 0, 0, 0];
  for (const r of results) stages[r.summary.maxDebtStage] = (stages[r.summary.maxDebtStage] ?? 0) + 1 / runs;
  const bankruptDays = results
    .filter((r) => r.failure === "bankrupt")
    .map((r) => r.summary.lastDay)
    .sort((a, b) => a - b);
  return {
    bot,
    runs,
    survivalRate: results.filter((r) => r.failure === null).length / runs,
    netWorth: {
      p10: percentile(worth, 10),
      p25: percentile(worth, 25),
      p50: percentile(worth, 50),
      p75: percentile(worth, 75),
      p90: percentile(worth, 90),
      mean,
      stdev,
    },
    maxDebtStage: stages,
    failures: {
      bankrupt: results.filter((r) => r.failure === "bankrupt").length,
      landLost: results.filter((r) => r.failure === "landLost").length,
    },
    medianBankruptDay: bankruptDays.length > 0 ? percentile(bankruptDays, 50) : null,
    meanSeasons: results.reduce((s, r) => s + r.summary.seasonsCompleted, 0) / runs,
    refusalsPerRun: results.reduce((s, r) => s + Object.values(r.refusals).reduce((a, b) => a + b, 0), 0) / runs,
  };
}

const tr = (v: number) => `${(v / 1_000_000).toFixed(1)} tr`;
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

export function formatReports(reports: readonly BotReport[]): string {
  const rows: [string, (r: BotReport) => string][] = [
    ["Số lượt", (r) => String(r.runs)],
    ["Sống sót hết năm", (r) => pct(r.survivalRate)],
    ["Tài sản ròng p10", (r) => tr(r.netWorth.p10)],
    ["Tài sản ròng p25", (r) => tr(r.netWorth.p25)],
    ["Tài sản ròng p50", (r) => tr(r.netWorth.p50)],
    ["Tài sản ròng p75", (r) => tr(r.netWorth.p75)],
    ["Tài sản ròng p90", (r) => tr(r.netWorth.p90)],
    ["Độ lệch chuẩn", (r) => tr(r.netWorth.stdev)],
    ["Phá sản", (r) => String(r.failures.bankrupt)],
    ["Mất ruộng cuối năm", (r) => String(r.failures.landLost)],
    ["Ngày phá sản (trung vị)", (r) => (r.medianBankruptDay === null ? "–" : String(r.medianBankruptDay))],
    ["Vụ đã tính sổ (TB)", (r) => r.meanSeasons.toFixed(2)],
    ...[0, 1, 2, 3, 4, 5].map((stage): [string, (r: BotReport) => string] => [
      `Bậc nợ cao nhất = ${stage}`,
      (r) => pct(r.maxDebtStage[stage] ?? 0),
    ]),
    ["Hành động bị từ chối/lượt", (r) => r.refusalsPerRun.toFixed(1)],
  ];
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  const header = "".padEnd(width) + reports.map((r) => r.bot.padStart(12)).join("");
  return [header, ...rows.map(([label, fn]) => label.padEnd(width) + reports.map((r) => fn(r).padStart(12)).join(""))].join("\n");
}

export function runsCsv(results: readonly GameResult[]): string {
  const head = "bot,seed,end_reason,failure,last_day,net_worth,peak_cash,largest_debt,uy_tin,seasons,max_debt_stage,near_bankruptcy";
  const lines = results.map((r) => {
    const s = r.summary;
    return [r.bot, s.seed, s.endReason, r.failure ?? "", s.lastDay, s.netWorth, s.peakCash, s.largestDebt, s.uyTin.toFixed(1), s.seasonsCompleted, s.maxDebtStage, s.nearBankruptcyCount].join(",");
  });
  return [head, ...lines].join("\n") + "\n";
}

/** Mean cash per day for each bot (runs that ended early keep their last value). */
export function cashByDayCsv(byBot: Record<string, readonly GameResult[]>, days: number): string {
  const bots = Object.keys(byBot);
  const lines = [`day,${bots.join(",")}`];
  for (let d = 0; d < days; d++) {
    const cells = bots.map((bot) => {
      const results = byBot[bot] ?? [];
      const values = results.map((r) => r.cashByDay[d] ?? r.cashByDay.at(-1) ?? 0);
      return Math.round(values.reduce((s, v) => s + v, 0) / Math.max(1, values.length));
    });
    lines.push(`${d},${cells.join(",")}`);
  }
  return lines.join("\n") + "\n";
}
