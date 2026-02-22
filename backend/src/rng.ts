/**
 * Mulberry32 — deterministic seeded PRNG (32-bit).
 * No external dependencies. Produces identical sequences for identical seeds.
 */
export function mulberry32(seed: number): () => number {
    // Coerce to 32-bit unsigned, guard degenerate seed=0
    let s = (seed >>> 0) || 1;
    return function (): number {
      s += 0x6d2b79f5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  
  /**
   * Box-Muller: normal(mean, stdDev) using two uniform samples.
   * Guards u1 near 0 to prevent log(0) = -Infinity → NaN.
   */
  export function sampleNormal(rng: () => number, mean: number, stdDev: number): number {
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z;
  }
  
  /** Clamp value to [min, max]. */
  export function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
  
  /** Percentile of a sorted numeric array (already sorted ascending). */
  export function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
    return sorted[idx];
  }