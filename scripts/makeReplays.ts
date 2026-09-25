// Regenerates the golden replays in tests/replays/ (M3.4). Run: npm run make-replays
// Only do this on purpose: a changed golden file means the game's results changed.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadData } from "../data/loadData";
import { goldenOf, type GoldenReplay } from "../core/golden";
import { BOTS } from "../sim/bots";
import { runGame } from "../sim/runGame";

/** Chosen from sim runs (BALANCE_LOG run 2): safe survives 2 seasons, average goes bankrupt, risky survives 3 seasons. */
const CASES: { bot: string; seed: number }[] = [
  { bot: "safe", seed: 13 },
  { bot: "average", seed: 5 },
  { bot: "risky", seed: 1 },
];

const data = loadData();
const dir = join(import.meta.dirname, "..", "tests", "replays");
mkdirSync(dir, { recursive: true });

for (const { bot, seed } of CASES) {
  const policy = BOTS[bot];
  if (!policy) throw new Error(`unknown bot ${bot}`);
  const { session } = runGame(seed, policy, data);
  const golden: GoldenReplay = {
    description: `Bot ${bot}, seed ${seed}: ${session.save.actions.length} actions, ends "${session.state.phase.kind === "gameOver" ? session.state.phase.reason : "?"}" on day ${session.state.day}.`,
    save: { version: session.save.version, seed: session.save.seed, actions: session.save.actions },
    expected: goldenOf(session.state, data),
  };
  const file = join(dir, `${bot}-seed${seed}.json`);
  writeFileSync(file, JSON.stringify(golden, null, 1) + "\n");
  console.log(`wrote ${file}`);
}
