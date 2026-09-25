import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { goldenOf, type GoldenReplay } from "../../core/golden";
import { replay } from "../../core/save";
import { data } from "../helpers";

// Golden replays (M3.4): recorded saves + expected results. The same files check the Godot port.
// If one fails after an intended rule/data change, regenerate with `npm run make-replays` and review the diff.
const DIR = join(import.meta.dirname, "..", "replays");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));

describe("golden replays", () => {
  it("there are at least 3", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it.each(files)("%s replays to the recorded result", (file) => {
    const golden = JSON.parse(readFileSync(join(DIR, file), "utf8")) as GoldenReplay;
    const state = replay(golden.save, data);
    expect(goldenOf(state, data)).toEqual(golden.expected);
  });
});
