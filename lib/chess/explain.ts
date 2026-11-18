import { Chess, type PieceSymbol, type Square } from "chess.js";
import type { PositionEval, Classification, CoachNote, OpeningInfo } from "@/lib/types";
import { attackedEnemyPieces, PIECE_NAMES, PIECE_VALUES } from "@/lib/chess/tactics";
import { cpToWinPercent } from "@/lib/chess/winPercent";

export interface ExplainInput {
  san: string;
  uci: string;
  color: "w" | "b";
  ply: number;
  moveNumber: number;
  classification: Classification;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  capturedPiece: string | null;
  fenBefore: string;
  fenAfter: string;
  evalBefore: PositionEval;
  evalAfter: PositionEval;
  isBook: boolean;
  isCriticalMoment: boolean;
  isOnlyMove: boolean;
  leftBook: boolean;
  /** Opening as of this move (most specific known line so far). */
  opening: OpeningInfo | null;
}

const opponentOf = (c: "w" | "b") => (c === "w" ? "b" : "w");
const playerName = (c: "w" | "b") => (c === "w" ? "White" : "Black");

const HEADLINE_VERB: Record<Classification, string> = {
  brilliant: "is brilliant",
  great: "is a great move",
  best: "is best",
  excellent: "is excellent",
  good: "is good",
  book: "is a book move",
  inaccuracy: "is an inaccuracy",
  mistake: "is a mistake",
  blunder: "is a blunder",
  miss: "is a miss",
};

/** Builds the structured coach note shown in the review panel. */
export function coachMove(input: ExplainInput): CoachNote {
  const headline = input.isOnlyMove
    ? `${input.san} is the only move`
    : `${input.san} ${HEADLINE_VERB[input.classification]}`;

  if (input.isCheckmate) {
    return {
      headline: `${input.san} is checkmate`,
      idea: `${playerName(input.color)} delivers checkmate and wins the game.`,
      consequence: null,
      bestMoveSan: null,
      bestLineSan: [],
      evalChange: null,
    };
  }

  if (input.isBook) {
    const where = input.opening ? `the ${input.opening.name}` : "known opening theory";
    return {
      headline,
      idea: joinSentences(`A standard move in ${where}.`, describeIdea(input)),
      consequence: null,
      bestMoveSan: null,
      bestLineSan: [],
      evalChange: null,
    };
  }

  const idea = input.isOnlyMove
    ? `${playerName(input.color)} had no choice here: ${input.san} is the only legal move.`
    : describeIdea(input) ?? describeWhatItDoes(input);

  const consequenceParts: string[] = [];
  if (input.leftBook) {
    consequenceParts.push(
      input.opening
        ? `This is the first move out of known theory in the ${input.opening.name}.`
        : "This is the first move out of known opening theory."
    );
  }
  switch (input.classification) {
    case "brilliant":
      consequenceParts.push(
        "It's a real sacrifice, giving up material on purpose, yet it's objectively the strongest move and very hard to find."
      );
      break;
    case "great":
      consequenceParts.push(
        "It's the only good move here; anything else would let the advantage slip away."
      );
      break;
    case "best":
      if (!input.isOnlyMove) consequenceParts.push("This is exactly what the engine recommends.");
      break;
    case "excellent":
      consequenceParts.push("Almost as strong as the engine's top choice.");
      break;
    case "good":
      consequenceParts.push("A solid move, though there was something a little more precise.");
      break;
    default: {
      const c = describeConsequence(input);
      if (c) consequenceParts.push(c);
    }
  }
  if (input.isCriticalMoment && input.classification !== "brilliant") {
    const swing = describeSwing(input);
    if (swing) consequenceParts.push(swing);
  }

  const best = input.evalBefore.bestMoveSan;
  const showBest = !!best && best !== input.san && !["best", "brilliant", "great"].includes(input.classification);

  return {
    headline,
    idea,
    consequence: consequenceParts.length ? consequenceParts.join(" ") : null,
    bestMoveSan: showBest ? best : null,
    bestLineSan: showBest ? input.evalBefore.bestLineSan.slice(0, 6) : [],
    evalChange: describeEvalChange(input.evalBefore, input.evalAfter),
  };
}

/** Plain-text version of the coach note (used in tooltips and the game summary). */
export function explainMove(input: ExplainInput): string {
  return noteToText(coachMove(input));
}

export function noteToText(note: CoachNote): string {
  const parts = [note.idea, note.consequence];
  if (note.bestMoveSan) {
    parts.push(
      `Better was ${note.bestMoveSan}${note.bestLineSan.length > 1 ? `, continuing ${note.bestLineSan.slice(1, 4).join(" ")}` : ""}.`
    );
  }
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------- the idea

const CENTER = new Set(["d4", "e4", "d5", "e5"]);
const FLANK_BREAKS = new Set(["c4", "c5", "f4", "f5"]);

/** One or two sentences on *why* a move is played: development, center,
 *  castling, threats, trades. Returns null if nothing specific applies. */
function describeIdea(input: ExplainInput): string | null {
  let chess: Chess;
  try {
    chess = new Chess(input.fenBefore);
  } catch {
    return null;
  }
  const from = input.uci.slice(0, 2) as Square;
  const to = input.uci.slice(2, 4) as Square;
  const piece = chess.get(from)?.type as PieceSymbol | undefined;
  if (!piece) return null;
  const name = PIECE_NAMES[piece];
  const backRank = input.color === "w" ? "1" : "8";
  const fullMove = input.moveNumber;
  const sentences: string[] = [];

  if (input.san.startsWith("O-O")) {
    sentences.push(
      `Castling ${input.san === "O-O" ? "kingside" : "queenside"} tucks the king into safety and brings the rook toward the center.`
    );
  } else if (input.uci.length > 4) {
    sentences.push(`The pawn promotes to a ${PIECE_NAMES[input.uci[4] as PieceSymbol] ?? "queen"}.`);
  } else if (input.isCapture && input.capturedPiece) {
    const captured = PIECE_NAMES[input.capturedPiece as PieceSymbol];
    const even = PIECE_VALUES[input.capturedPiece as PieceSymbol] === PIECE_VALUES[piece];
    sentences.push(
      even && piece !== "p"
        ? `${input.san} trades ${articleFor(name)} ${name} for the ${captured} on ${to}.`
        : `${input.san} captures the ${captured} on ${to}.`
    );
  } else if ((piece === "n" || piece === "b") && from[1] === backRank && fullMove <= 15) {
    if (piece === "b" && ["g2", "b2", "g7", "b7"].includes(to)) {
      sentences.push(`The bishop is fianchettoed on ${to}, aiming down the long diagonal.`);
    } else {
      sentences.push(`Develops the ${name} to ${to}, bringing another piece into the game.`);
    }
  } else if (piece === "p" && CENTER.has(to) && fullMove <= 15) {
    sentences.push(`The pawn on ${to} stakes a claim in the center.`);
  } else if (piece === "p" && FLANK_BREAKS.has(to) && fullMove <= 15) {
    sentences.push(`The pawn on ${to} challenges the opponent's center.`);
  } else if (piece === "p" && ["d3", "e3", "d6", "e6"].includes(to) && fullMove <= 10) {
    sentences.push(`A solid pawn move that supports the center and opens a diagonal for the bishop.`);
  } else if (piece === "p" && ["g3", "b3", "g6", "b6"].includes(to) && fullMove <= 10) {
    sentences.push(`This prepares to fianchetto the bishop.`);
  } else if (piece === "q" && fullMove <= 6) {
    sentences.push(`This brings the queen out early, which can make it a target for the opponent's development.`);
  } else if (piece === "k" && fullMove <= 25) {
    sentences.push(`The king moves by hand instead of castling.`);
  }

  // Threats created by the moved piece (or check).
  if (input.isCheck && !input.isCheckmate) {
    sentences.push(sentences.length ? "It also gives check, forcing a response." : `${input.san} gives check, forcing a response.`);
  } else {
    const threats = attackedEnemyPieces(input.fenAfter, to, input.color).filter(
      (t) => t.piece !== "k" && (!t.defended || t.value > PIECE_VALUES[piece])
    );
    const subject = sentences.length ? "It" : input.san;
    if (threats.length >= 2) {
      sentences.push(
        `${subject} attacks the ${PIECE_NAMES[threats[0].piece]} on ${threats[0].square} and the ${PIECE_NAMES[threats[1].piece]} on ${threats[1].square} at the same time.`
      );
    } else if (threats.length === 1 && threats[0].value >= 3) {
      sentences.push(`${subject} attacks the ${PIECE_NAMES[threats[0].piece]} on ${threats[0].square}.`);
    }
  }

  return sentences.length ? sentences.slice(0, 2).join(" ") : null;
}

function describeWhatItDoes(input: ExplainInput): string {
  const mover = playerName(input.color);
  if (input.isCheck) return `${mover} plays ${input.san}, giving check.`;
  return `${mover} plays ${input.san}.`;
}

// ---------------------------------------------------------- consequences

/** What the played move concretely hands the opponent, using the engine's
 *  suggested reply in the resulting position (hanging material, forks, mating nets). */
function describeConsequence(input: ExplainInput): string {
  const exposed = describeExposure(input);
  const main = describeReply(input);
  return [exposed, main].filter(Boolean).join(" ");
}

/** Detects a piece the move leaves newly attacked (e.g. moving a pinned knight
 *  and uncovering the queen behind it). */
function describeExposure(input: ExplainInput): string | null {
  try {
    const before = new Chess(input.fenBefore);
    const after = new Chess(input.fenAfter);
    const opponent = opponentOf(input.color);
    const movedFrom = input.uci.slice(0, 2);
    const movedTo = input.uci.slice(2, 4) as Square;
    let worst: { square: Square; piece: PieceSymbol; attacker: Square } | null = null;
    for (const row of after.board()) {
      for (const sq of row) {
        if (!sq || sq.color !== input.color || sq.type === "k" || sq.square === movedTo) continue;
        const attackersAfter = after.attackers(sq.square, opponent);
        if (!attackersAfter.length) continue;
        const attackersBefore = before.attackers(sq.square, opponent);
        const newAttacker = attackersAfter.find((a) => !attackersBefore.includes(a));
        if (!newAttacker) continue;
        const attackerPiece = after.get(newAttacker);
        const defended = after.attackers(sq.square, input.color).length > 0;
        const cheaper = attackerPiece && PIECE_VALUES[attackerPiece.type] < PIECE_VALUES[sq.type];
        if (PIECE_VALUES[sq.type] < 3 || (defended && !cheaper)) continue;
        if (!worst || PIECE_VALUES[sq.type] > PIECE_VALUES[worst.piece]) {
          worst = { square: sq.square, piece: sq.type, attacker: newAttacker };
        }
      }
    }
    if (!worst) return null;
    const attacker = after.get(worst.attacker);
    const movedName = PIECE_NAMES[(before.get(movedFrom as Square)?.type ?? "p") as PieceSymbol];
    return `Moving the ${movedName} off ${movedFrom} exposes the ${PIECE_NAMES[worst.piece]} on ${worst.square} to the ${attacker ? PIECE_NAMES[attacker.type] : "piece"} on ${worst.attacker}.`;
  } catch {
    return null;
  }
}

function describeReply(input: ExplainInput): string {
  const { fenAfter, evalAfter, color } = input;
  const opponent = opponentOf(color);
  const replyUci = evalAfter.bestMoveUci;
  const replySan = evalAfter.bestMoveSan;
  if (!replyUci || !replySan) return genericSeverityPhrase(input);

  try {
    const chess = new Chess(fenAfter);
    const from = replyUci.slice(0, 2) as Square;
    const to = replyUci.slice(2, 4) as Square;
    const promotion = replyUci.length > 4 ? replyUci.slice(4) : undefined;
    const moveResult = chess.move({ from, to, promotion });
    if (!moveResult) return genericSeverityPhrase(input);

    if (evalAfter.mate != null) {
      const mateSide = evalAfter.mate > 0 ? "w" : "b";
      if (mateSide === opponent) {
        const n = Math.abs(evalAfter.mate);
        return `This allows ${replySan}, and ${playerName(opponent)} has a forced checkmate in ${n}.`;
      }
    }

    if (moveResult.isCapture() && moveResult.captured) {
      const capturedName = PIECE_NAMES[moveResult.captured];
      return `This ${input.isCapture ? "capture" : "move"} leaves the ${capturedName} on ${to} to be taken by ${replySan}.`;
    }

    const targets = attackedEnemyPieces(chess.fen(), to, opponent).filter(
      (t) => t.value >= 3 && !t.defended
    );
    if (targets.length >= 2) {
      return `This walks into a fork: ${replySan} attacks ${targets.length} pieces at once.`;
    }
    if (targets.length === 1) {
      return `After ${replySan}, the ${PIECE_NAMES[targets[0].piece]} on ${targets[0].square} is left hanging.`;
    }
    if (moveResult.san.includes("+")) {
      return `This allows ${replySan} with check, and ${playerName(opponent)} takes the initiative.`;
    }
    return `${genericSeverityPhrase(input)} The strongest reply is ${replySan}.`.trim();
  } catch {
    return genericSeverityPhrase(input);
  }
}

function genericSeverityPhrase(input: ExplainInput): string {
  switch (input.classification) {
    case "blunder":
      return "This throws away a large part of the advantage.";
    case "mistake":
      return "This gives the opponent a clear edge.";
    case "miss":
      return "This lets a much stronger continuation slip away.";
    case "inaccuracy":
      return "A small slip that gives up a little of the position.";
    default:
      return "";
  }
}

function describeSwing(input: ExplainInput): string | null {
  const before = cpToWinPercent(input.evalBefore.cp, "w");
  const after = cpToWinPercent(input.evalAfter.cp, "w");
  const swing = Math.round(Math.abs(before - after));
  if (swing < 10) return null;
  return `It's a turning point: the winning chances swing by about ${swing}%.`;
}

// ------------------------------------------------------------ evaluation

/** Evaluation, in words, from White's perspective, e.g. "Black is winning (−3.1)". */
export function describeEval(e: Pick<PositionEval, "cp" | "mate">): string {
  if (e.mate != null) {
    if (e.mate === 0) return "checkmate";
    const side = e.mate > 0 ? "White" : "Black";
    return `${side} has mate in ${Math.abs(e.mate)}`;
  }
  const pawns = e.cp / 100;
  const abs = Math.abs(pawns);
  const side = pawns > 0 ? "White" : "Black";
  const num = `${pawns > 0 ? "+" : pawns < 0 ? "−" : ""}${abs.toFixed(1)}`;
  if (abs < 0.5) return `the position is equal (${num})`;
  if (abs < 1.5) return `${side} is slightly better (${num})`;
  if (abs < 4) return `${side} is clearly better (${num})`;
  return `${side} is winning (${num})`;
}

function describeEvalChange(before: PositionEval, after: PositionEval): string | null {
  if (before.depth === 0 && after.depth === 0) return null; // book placeholders, not real evals
  const b = describeEval(before);
  const a = describeEval(after);
  if (b === a) return `${capitalize(a)}.`;
  return `Before: ${b}. After: ${a}.`;
}

// ------------------------------------------------------------- helpers

function joinSentences(...parts: (string | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function articleFor(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}
