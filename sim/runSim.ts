import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadData } from "../data/loadData";
import { BOTS } from "./bots";
import { buildReport, cashByDayCsv, formatReports, runsCsv } from "./report";
import { runGame, type GameResult } from "./runGame";

const { values } = parseArgs({
  options: {
    bot: { type: "string", default: "all" },
    runs: { type: "string", default: "1000" },
    "seed-start": { type: "string", default: "1" },
    out: { type: "string", default: join(import.meta.dirname, "output") },
  },
});

const runs = Number(values.runs);
const seedStart = Number(values["seed-start"]);
if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(seedStart)) {
  console.error("Usage: npm run sim -- --bot <safe|average|risky|all> --runs <N> [--seed-start <S>] [--out <dir>]");
  process.exit(1);
}
const botNames = values.bot === "all" ? Object.keys(BOTS) : [values.bot];
for (const name of botNames) {
  if (!BOTS[name]) {
    console.error(`Unknown bot "${name}". Choose one of: ${Object.keys(BOTS).join(", ")}, all`);
    process.exit(1);
  }
}

const data = loadData();
const byBot: Record<string, GameResult[]> = {};
const started = performance.now();
for (const name of botNames) {
  const policy = BOTS[name];
  if (!policy) continue;
  const results: GameResult[] = [];
  for (let i = 0; i < runs; i++) {
    const { session: _session, ...result } = runGame(seedStart + i, policy, data);
    results.push(result);
  }
  byBot[name] = results;
  console.error(`${name}: ${runs} runs done (${((performance.now() - started) / 1000).toFixed(1)} s)`);
}

const reports = botNames.map((name) => buildReport(name, byBot[name] ?? []));
console.log(`Seeds ${seedStart}–${seedStart + runs - 1}\n`);
console.log(formatReports(reports));

mkdirSync(values.out, { recursive: true });
const all = botNames.flatMap((name) => byBot[name] ?? []);
writeFileSync(join(values.out, "runs.csv"), runsCsv(all));
writeFileSync(join(values.out, "cash_by_day.csv"), cashByDayCsv(byBot, data.calendar.daysInYear));
writeFileSync(join(values.out, "report.json"), JSON.stringify(reports, null, 2));
console.log(`\nCSV: ${join(values.out, "runs.csv")}, ${join(values.out, "cash_by_day.csv")}`);
