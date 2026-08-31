import type { GameAnalysis } from "@/lib/types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** FEN of the position after `ply` half-moves (ply 0 = starting position). */
export function fenAtPly(analysis: GameAnalysis, ply: number): string {
  if (ply <= 0) return analysis.moves[0]?.fenBefore ?? START_FEN;
  const move = analysis.moves[ply - 1];
  return move ? move.fenAfter : START_FEN;
}

export function totalPlies(analysis: GameAnalysis): number {
  return analysis.moves.length;
}
