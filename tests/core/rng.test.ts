import { describe, expect, it } from "vitest";
import { mulberry32Step, Rng, seedToState } from "../../core/rng";

function take(rng: Rng, n: number): number[] {
  return Array.from({ length: n }, () => rng.nextUint32());
}

describe("mulberry32 reference sequence (golden values for the Godot port)", () => {
  // Produced by the canonical mulberry32 implementation, independent of core/rng.ts.
  const golden: [number, number[]][] = [
    [0, [1144304738, 1416247, 958946056, 627933444, 2007157716]],
    [1, [2693262067, 11749833, 2265367787, 4213581821, 4159151403]],
    [12345, [4207900869, 1317490944, 2079646450, 3513001552, 2187978186]],
    [4294967295, [3850105811, 813802916, 3073704848, 4054706436, 3630262831]],
  ];

  it.each(golden)("seed %i", (seed, expected) => {
    expect(take(Rng.fromSeed(seed), 5)).toEqual(expected);
  });

  it("mulberry32Step is pure", () => {
    const a = mulberry32Step(12345);
    const b = mulberry32Step(12345);
    expect(a).toEqual(b);
    expect(a.value).toBe(4207900869);
  });
});

describe("determinism and state", () => {
  it("same seed gives the same sequence", () => {
    expect(take(Rng.fromSeed(42), 1000)).toEqual(take(Rng.fromSeed(42), 1000));
  });

  it("different seeds give different sequences", () => {
    expect(take(Rng.fromSeed(42), 10)).not.toEqual(take(Rng.fromSeed(43), 10));
  });

  it("restoring from a saved state continues the exact same sequence", () => {
    const original = Rng.fromSeed(7);
    take(original, 123);
    const saved = original.state;
    const expected = take(original, 50);
    expect(take(Rng.fromState(saved), 50)).toEqual(expected);
  });

  it("state is always a JSON-safe uint32", () => {
    const rng = Rng.fromSeed(-1);
    for (let i = 0; i < 10_000; i++) {
      rng.nextUint32();
      const s = rng.state;
      expect(Number.isInteger(s) && s >= 0 && s <= 0xffffffff).toBe(true);
    }
    expect(JSON.parse(JSON.stringify({ s: rng.state })).s).toBe(rng.state);
  });

  it("seedToState maps any integer seed into uint32", () => {
    expect(seedToState(0)).toBe(0);
    expect(seedToState(-1)).toBe(0xffffffff);
    expect(seedToState(2 ** 32 + 5)).toBe(5);
    expect(() => seedToState(1.5)).toThrow(RangeError);
  });

  it("rejects invalid states", () => {
    expect(() => Rng.fromState(-1)).toThrow(RangeError);
    expect(() => Rng.fromState(2 ** 32)).toThrow(RangeError);
    expect(() => Rng.fromState(0.5)).toThrow(RangeError);
  });
});

describe("helpers each consume exactly one draw", () => {
  const cases: [string, (rng: Rng) => unknown][] = [
    ["nextFloat", (r) => r.nextFloat()],
    ["nextInt", (r) => r.nextInt(1, 6)],
    ["nextInt (single value)", (r) => r.nextInt(3, 3)],
    ["chance(0)", (r) => r.chance(0)],
    ["chance(1)", (r) => r.chance(1)],
    ["chance(0.5)", (r) => r.chance(0.5)],
    ["pickWeighted", (r) => r.pickWeighted(["a", "b"], () => 1)],
  ];

  it.each(cases)("%s", (_name, draw) => {
    const a = Rng.fromSeed(99);
    const b = Rng.fromSeed(99);
    draw(a);
    b.nextUint32();
    expect(a.state).toBe(b.state);
  });
});

describe("distributions", () => {
  const N = 100_000;

  it("nextFloat is in [0, 1) with mean ≈ 0.5", () => {
    const rng = Rng.fromSeed(1);
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const x = rng.nextFloat();
      expect(x >= 0 && x < 1).toBe(true);
      sum += x;
    }
    expect(sum / N).toBeCloseTo(0.5, 2);
  });

  it("nextInt covers [min, max] inclusively and uniformly", () => {
    const rng = Rng.fromSeed(2);
    const counts = new Map<number, number>();
    for (let i = 0; i < N; i++) {
      const x = rng.nextInt(-2, 2);
      counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2]);
    for (const c of counts.values()) expect(c / N).toBeCloseTo(0.2, 2);
  });

  it("nextInt rejects bad ranges", () => {
    const rng = Rng.fromSeed(3);
    expect(() => rng.nextInt(5, 4)).toThrow(RangeError);
    expect(() => rng.nextInt(0, 1.5)).toThrow(RangeError);
  });

  it("chance(p) is true with frequency ≈ p; 0 never, 1 always", () => {
    const rng = Rng.fromSeed(4);
    let hits = 0;
    for (let i = 0; i < N; i++) if (rng.chance(0.3)) hits++;
    expect(hits / N).toBeCloseTo(0.3, 2);
    for (let i = 0; i < 1000; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
    expect(() => rng.chance(Number.NaN)).toThrow(RangeError);
  });

  it("pickWeighted follows the weights and never picks zero-weight items", () => {
    const rng = Rng.fromSeed(5);
    const weights: Record<string, number> = { sunny: 0.65, cloudy: 0.27, rain: 0.07, heavy_rain: 0.01, storm: 0 };
    const keys = Object.keys(weights);
    const counts: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const k = rng.pickWeighted(keys, (key) => weights[key] ?? 0);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    expect(counts.storm).toBeUndefined();
    for (const k of ["sunny", "cloudy", "rain", "heavy_rain"]) {
      expect((counts[k] ?? 0) / N).toBeCloseTo(weights[k] ?? 0, 2);
    }
  });

  it("pickWeighted rejects empty, all-zero or negative weights", () => {
    const rng = Rng.fromSeed(6);
    expect(() => rng.pickWeighted([], () => 1)).toThrow(RangeError);
    expect(() => rng.pickWeighted(["a"], () => 0)).toThrow(RangeError);
    expect(() => rng.pickWeighted(["a", "b"], (x) => (x === "a" ? -1 : 1))).toThrow(RangeError);
  });
});
