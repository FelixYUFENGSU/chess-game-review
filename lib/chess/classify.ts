import type { PositionEval, Classification } from "@/lib/types";
import { cpToWinPercent } from "@/lib/chess/winPercent";
import { staticExchangeEval, PIECE_VALUES } from "@/lib/chess/tactics";
import type { Square, PieceSymbol } from "chess.js";

/**
 * Move-classification thresholds.
 *
 * IMPORTANT: chess.com has never published its exact classification formula (it's
 * known to blend centipawn loss with position-dependent context, not fixed cutoffs).
 * The win%-loss thresholds below are a documented, widely-used approximation
 * (the same shape Lichess uses for its own move annotations) tuned to feel
 * directionally similar to chess.com's categories. Treat exact boundaries as
 * approximate, not authoritative.
 */
const THRESHOLDS = {
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 20,
  // anything above `mistake` is a blunder
};

/**
 * Centipawn-loss ceilings, applied alongside the win% thresholds while the game is
 * still undecided. Win% flattens out once one side is ahead, so on win% alone a
 * move that drops a full pawn at +3 can still look "excellent". A move gets the
 * stricter of the two verdicts (cp alone never makes something a blunder).
 */
const CP_THRESHOLDS = {
  excellent: 25,
  good: 60,
  inaccuracy: 150,
};
/** |eval| (cp) beyond which the game counts as decided and only win% applies. */
const DECIDED_CP = 600;

const SEVERITY: Classification[] = ["excellent", "good", "inaccuracy", "mistake", "blunder"];
function stricter(a: Classification, b: Classification): Classification {
  return SEVERITY.indexOf(a) >= SEVERITY.indexOf(b) ? a : b;
}

/** Minimum win% gap between the best and 2nd-best engine line to call a position "critical". */
const GREAT_MOVE_GAP = 12;

/** Win% (mover POV) above which the position counts as "clearly winning" for Miss detection. */
const CLEARLY_WINNING_WIN_PCT = 88;

export interface ClassifyInput {
  color: "w" | "b";
  sanPlayed: string;
  uciPlayed: string;
  fenAfter: string;
  toSquare: Square;
  movedPiece: PieceSymbol;
  /** Piece symbol captured by the played move itself, if any (credited back in sacrifice detection). */
  capturedByMove: PieceSymbol | null;
  evalBefore: PositionEval;
  evalAfter: PositionEval;
  isBook: boolean;
  isCheckmate: boolean;
  ply: number;
}

export interface ClassifyResult {
  classification: Classification;
  winPercentBeforeMoverPov: number;
  winPercentAfterMoverPov: number;
  winPercentLossMoverPov: number;
  cpLossMoverPov: number;
}

export function classifyMove(input: ClassifyInput): ClassifyResult {
  const { color, evalBefore, evalAfter, isBook } = input;

  const winBefore = cpToWinPercent(evalBefore.cp, color);
  const winAfter = cpToWinPercent(evalAfter.cp, color);
  const winLoss = Math.max(0, winBefore - winAfter);
  const cpLoss = Math.max(
    0,
    color === "w" ? evalBefore.cp - evalAfter.cp : evalAfter.cp - evalBefore.cp
  );

  const base: Omit<ClassifyResult, "classification"> = {
    winPercentBeforeMoverPov: winBefore,
    winPercentAfterMoverPov: winAfter,
    winPercentLossMoverPov: winLoss,
    cpLossMoverPov: cpLoss,
  };

  if (isBook) {
    return { classification: "book", ...base };
  }

  const isBestMove =
    input.uciPlayed === evalBefore.bestMoveUci || input.sanPlayed === evalBefore.bestMoveSan;

  if (isBestMove) {
    if (input.isCheckmate) {
      return { classification: "best", ...base };
    }
    if (isBrilliant(input, winAfter)) {
      return { classification: "brilliant", ...base };
    }
    if (isGreatMove(evalBefore)) {
      return { classification: "great", ...base };
    }
    return { classification: "best", ...base };
  }

  const undecided =
    evalBefore.mate == null && evalAfter.mate == null && Math.abs(evalBefore.cp) < DECIDED_CP;
  const byCp: Classification = !undecided
    ? "excellent"
    : cpLoss <= CP_THRESHOLDS.excellent
      ? "excellent"
      : cpLoss <= CP_THRESHOLDS.good
        ? "good"
        : cpLoss <= CP_THRESHOLDS.inaccuracy
          ? "inaccuracy"
          : "mistake";

  if (winLoss <= THRESHOLDS.excellent) return { classification: stricter("excellent", byCp), ...base };
  if (winLoss <= THRESHOLDS.good) return { classification: stricter("good", byCp), ...base };

  // A "miss" is a mistake/blunder-sized win% drop from a position that was
  // clearly winning (or had a forced mate) for the mover — i.e. a missed win,
  // not just an ordinary error.
  const wasClearlyWinning = winBefore >= CLEARLY_WINNING_WIN_PCT;
  if (winLoss > THRESHOLDS.mistake && wasClearlyWinning) {
    return { classification: "miss", ...base };
  }

  if (winLoss <= THRESHOLDS.inaccuracy) return { classification: stricter("inaccuracy", byCp), ...base };
  if (winLoss <= THRESHOLDS.mistake) return { classification: "mistake", ...base };
  return { classification: "blunder", ...base };
}

/** A position counts as "critical" when the runner-up engine line is meaningfully worse. */
function isGreatMove(evalBefore: PositionEval): boolean {
  if (evalBefore.secondBestCp == null) return false;
  const bestWin = cpToWinPercent(evalBefore.cp, "w");
  const secondWin = cpToWinPercent(evalBefore.secondBestCp, "w");
  return Math.abs(bestWin - secondWin) >= GREAT_MOVE_GAP;
}

/**
 * A "Brilliant" is the engine's top move, played in a position that wasn't already a
 * trivial blowout, where the piece that just moved can objectively be won back by the
 * opponent for less than its value (a real sacrifice) yet the position stays strong
 * for the mover. This mirrors the spirit of chess.com's Brilliant detector without
 * reproducing its (unpublished) exact algorithm.
 */
function isBrilliant(input: ClassifyInput, winAfterMoverPov: number): boolean {
  const { evalBefore, movedPiece, capturedByMove, toSquare, color, fenAfter, ply } = input;
  if (ply <= 6) return false; // ignore opening theory-ish moves
  if (movedPiece === "k" || movedPiece === "p") return false;

  const winBeforeMoverPov = cpToWinPercent(evalBefore.cp, color);
  // A game that's already nearly decided either way isn't a "brilliant" moment —
  // it's mop-up (or damage control), so tighten the window well short of the
  // "clearly winning" cutoff used elsewhere.
  if (winBeforeMoverPov > 92 || winBeforeMoverPov < 8) return false;
  // Must still be good for the mover after playing it.
  if (winAfterMoverPov < 55) return false;

  // Net material change of the whole move: what it captures on the way in, plus
  // what the static-exchange evaluation says happens to it afterwards. A real
  // sacrifice loses material overall, not just on the follow-up exchange — a
  // capture that merely gets recaptured for equal value (e.g. Nxb7 met by ...Rxb7)
  // is an ordinary trade, not a brilliancy.
  const capturedValue = capturedByMove ? PIECE_VALUES[capturedByMove] : 0;
  const seeResult = staticExchangeEval(fenAfter, toSquare, color);
  const netMaterial = capturedValue + seeResult;

  return netMaterial <= -3;
}
