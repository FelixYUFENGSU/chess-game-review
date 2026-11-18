import { Chess } from "chess.js";
import type { AnalyzedMove, GameAnalysis } from "@/lib/types";

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

export interface LineStep {
  san: string;
  uci: string;
  fen: string;
}

/** Plays an engine line (SAN moves) from `fen` and returns the position after each move. */
export function lineSteps(fen: string, sans: string[]): LineStep[] {
  const chess = new Chess(fen);
  const steps: LineStep[] = [];
  for (const san of sans) {
    try {
      const m = chess.move(san);
      steps.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ""), fen: chess.fen() });
    } catch {
      break;
    }
  }
  return steps;
}

/** The engine's best line from the position before `move`, when there is one worth showing. */
export function bestLineFor(move: AnalyzedMove): string[] {
  if (move.isBook || move.isCheckmate) return [];
  return move.evalBefore.bestLineSan;
}
