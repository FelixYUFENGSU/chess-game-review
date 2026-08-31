import { Chess, type PieceSymbol, type Square } from "chess.js";

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

/**
 * Simplified static-exchange evaluation of the piece sitting on `square` in `fen`.
 * Returns the net material result (in pawns, positive = good for the side that just
 * moved there) if the exchange on that square were played out with best play,
 * ignoring pins/x-rays/discoveries — a heuristic, not a full legal-move SEE.
 */
export function staticExchangeEval(fen: string, square: Square, ownerColor: "w" | "b"): number {
  const chess = new Chess(fen);
  const target = chess.get(square);
  if (!target) return 0;
  const ownedValue = PIECE_VALUES[target.type];

  const opponentColor = ownerColor === "w" ? "b" : "w";
  const opponentAttackers = attackerValues(chess, square, opponentColor);
  const ownDefenders = attackerValues(chess, square, ownerColor);

  const loss = swapOff(opponentAttackers, ownDefenders, ownedValue);
  return -loss;
}

function attackerValues(chess: Chess, square: Square, color: "w" | "b"): number[] {
  const squares = chess.attackers(square, color);
  return squares
    .map((sq) => chess.get(sq))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => PIECE_VALUES[p.type])
    .sort((a, b) => a - b);
}

/** Classic SEE "swap-off": side `attackers[0]` captures first if profitable, alternating. */
function swapOff(attackers: number[], defenders: number[], valueOnSquare: number): number {
  if (attackers.length === 0) return 0;
  const [lva, ...restAttackers] = attackers;
  const gain = valueOnSquare - Math.max(0, swapOff(defenders, restAttackers, lva));
  return Math.max(0, gain);
}

export interface AttackedTarget {
  square: Square;
  piece: PieceSymbol;
  value: number;
  defended: boolean;
}

/**
 * Squares of enemy pieces attacked by the piece now sitting on `square`, used as a
 * (heuristic) fork/tactic detector. `fen` should be the position right after the
 * piece landed on `square`; side-to-move in the FEN does not need to match `byColor`.
 */
export function attackedEnemyPieces(
  fen: string,
  square: Square,
  byColor: "w" | "b"
): AttackedTarget[] {
  const parts = fen.split(" ");
  parts[1] = byColor;
  parts[3] = "-"; // clear en-passant target; irrelevant here and can trip validation
  let chess: Chess;
  try {
    chess = new Chess(parts.join(" "), { skipValidation: true });
  } catch {
    return [];
  }
  let moves;
  try {
    moves = chess.moves({ square, verbose: true });
  } catch {
    return [];
  }
  const enemyColor = byColor === "w" ? "b" : "w";
  const targets: AttackedTarget[] = [];
  for (const m of moves) {
    if (!m.isCapture()) continue;
    const capturedSquare = m.isEnPassant() ? undefined : m.to;
    if (!capturedSquare) continue;
    const piece = chess.get(capturedSquare);
    if (!piece || piece.color !== enemyColor) continue;
    targets.push({
      square: capturedSquare,
      piece: piece.type,
      value: PIECE_VALUES[piece.type],
      defended: chess.attackers(capturedSquare, byColor === "w" ? "b" : "w").length > 0,
    });
  }
  return targets;
}
