import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Enforces the CLAUDE.md rules for core/: no React, no DOM, no Math.random, no Date.now.
const CORE_DIR = join(import.meta.dirname, "../../core");

function listTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

const FORBIDDEN: [string, RegExp][] = [
  ["Math.random", /Math\.random/],
  ["Date.now", /Date\.now/],
  ["new Date", /new Date\b/],
  ["React import", /from\s+["']react/],
  ["DOM access", /\b(window|document|localStorage)\./],
];

describe("core/ purity", () => {
  const files = listTsFiles(CORE_DIR);

  it("finds core files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s uses no forbidden APIs", (file) => {
    const source = readFileSync(file, "utf8");
    const found = FORBIDDEN.filter(([, re]) => re.test(source)).map(([name]) => name);
    expect(found).toEqual([]);
  });
});
