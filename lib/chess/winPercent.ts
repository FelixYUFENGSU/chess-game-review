/**
 * Centipawn -> win% and accuracy% formulas.
 * These constants are the ones Lichess documents and open-sources for its own
 * "estimated accuracy" feature (https://lichess.org/page/accuracy). Chess.com's
 * exact formula is not public; this tracks it closely without claiming to be exact.
 */

const MATE_CP_SENTINEL = 100000;

/** Collapses a mate score into a large-magnitude centipawn value for graphing/thresholds. */
export function mateToCp(mateInN: number): number {
  const sign = mateInN > 0 ? 1 : -1;
  return sign * (MATE_CP_SENTINEL - Math.min(Math.abs(mateInN), 99) * 100);
}

/** cp (White POV) -> win% for White, in [0, 100]. */
export function cpToWhiteWinPercent(cp: number): number {
  const chances = 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
  return 50 + 50 * chances;
}

/** Win% for the given color, from a White-POV cp value. */
export function cpToWinPercent(cp: number, color: "w" | "b"): number {
  const whitePct = cpToWhiteWinPercent(cp);
  return color === "w" ? whitePct : 100 - whitePct;
}

/** Per-move accuracy given win% before/after from the mover's own perspective. */
export function moveAccuracy(winPercentBefore: number, winPercentAfter: number): number {
  const winDiff = Math.max(0, winPercentBefore - winPercentAfter);
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * winDiff) - 3.166924740191411;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Aggregate per-move accuracies into one game accuracy%.
 * Like Lichess, this averages the arithmetic mean with the harmonic mean: the
 * harmonic mean is dominated by the worst moves, so a game with a few real
 * mistakes can't hide behind many easy moves.
 */
export function gameAccuracy(perMoveAccuracies: number[]): number {
  if (perMoveAccuracies.length === 0) return 100;
  const n = perMoveAccuracies.length;
  const mean = perMoveAccuracies.reduce((a, b) => a + b, 0) / n;
  // Floor each value at 1 so a single 0% move doesn't make the harmonic mean 0.
  const harmonic = n / perMoveAccuracies.reduce((a, b) => a + 1 / Math.max(1, b), 0);
  return Math.round(((mean + harmonic) / 2) * 10) / 10;
}
