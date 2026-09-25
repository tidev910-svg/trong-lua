/**
 * Seeded RNG (mulberry32). The only source of randomness in core/.
 *
 * The whole generator state is one uint32, stored in GameState.rngState.
 * Usage inside a system: `const rng = Rng.fromState(state.rngState)`, draw,
 * then write `rng.state` back into the new GameState.
 *
 * Porting contract (Godot): every helper below consumes a fixed number of
 * draws regardless of its arguments, and all arithmetic is 32-bit unsigned.
 * Keep it that way so replays produce identical sequences.
 */

const UINT32_RANGE = 4294967296; // 2^32
const MULBERRY_INCREMENT = 0x6d2b79f5;

/** Converts a game seed into the initial RNG state. */
export function seedToState(seed: number): number {
  if (!Number.isInteger(seed)) throw new RangeError(`seed must be an integer, got ${seed}`);
  return seed >>> 0;
}

/** One mulberry32 step: returns the next uint32 output and the next state. */
export function mulberry32Step(state: number): { value: number; state: number } {
  const nextState = (state + MULBERRY_INCREMENT) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = (t ^ (t >>> 14)) >>> 0;
  return { value, state: nextState };
}

export class Rng {
  private current: number;

  private constructor(state: number) {
    this.current = state >>> 0;
  }

  static fromState(state: number): Rng {
    if (!Number.isInteger(state) || state < 0 || state >= UINT32_RANGE) {
      throw new RangeError(`rng state must be a uint32, got ${state}`);
    }
    return new Rng(state);
  }

  static fromSeed(seed: number): Rng {
    return new Rng(seedToState(seed));
  }

  /** Current state (uint32), to be written back into GameState. */
  get state(): number {
    return this.current;
  }

  /** Uniform integer in [0, 2^32). One draw. */
  nextUint32(): number {
    const step = mulberry32Step(this.current);
    this.current = step.state;
    return step.value;
  }

  /** Uniform float in [0, 1). One draw. */
  nextFloat(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** Uniform integer in [min, max], both inclusive. One draw. */
  nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`nextInt needs integers with min <= max, got [${min}, ${max}]`);
    }
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  /** True with probability p. Always one draw, even when p <= 0 or p >= 1. */
  chance(p: number): boolean {
    if (Number.isNaN(p)) throw new RangeError("chance probability is NaN");
    return this.nextFloat() < p;
  }

  /**
   * Picks one item with probability proportional to its weight. One draw.
   * Items are scanned in the given order, so callers must pass a fixed order
   * (e.g. WEATHER_STATES), never rely on object key order.
   */
  pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    let total = 0;
    let lastPositive: T | undefined;
    for (const item of items) {
      const w = weightOf(item);
      if (!Number.isFinite(w) || w < 0) throw new RangeError(`pickWeighted weight must be finite and >= 0, got ${w}`);
      if (w > 0) {
        total += w;
        lastPositive = item;
      }
    }
    if (lastPositive === undefined) throw new RangeError("pickWeighted needs at least one positive weight");

    const r = this.nextFloat() * total;
    let cumulative = 0;
    for (const item of items) {
      const w = weightOf(item);
      if (w <= 0) continue;
      cumulative += w;
      if (r < cumulative) return item;
    }
    // Only reachable through floating-point rounding at the very top of the range.
    return lastPositive;
  }
}
