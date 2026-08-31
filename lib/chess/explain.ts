import { Chess, type Square } from "chess.js";
import type { PositionEval, Classification } from "@/lib/types";
import { attackedEnemyPieces, PIECE_NAMES } from "@/lib/chess/tactics";
import { cpToWinPercent } from "@/lib/chess/winPercent";

interface ExplainInput {
  san: string;
  uci: string;
  color: "w" | "b";
  ply: number;
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
  openingName?: string;
}

const opponentOf = (c: "w" | "b") => (c === "w" ? "b" : "w");
const playerName = (c: "w" | "b") => (c === "w" ? "White" : "Black");

export function explainMove(input: ExplainInput): string {
  if (input.isCheckmate) {
    return `${input.san} delivers checkmate — the game is over.`;
  }

  if (input.isBook) {
    return input.openingName
      ? `A known theoretical move in the ${input.openingName}.`
      : `A standard developing move still within known opening theory.`;
  }

  const sentences: string[] = [];
  sentences.push(describeWhatItDoes(input));

  switch (input.classification) {
    case "brilliant":
      sentences.push(describeBrilliant());
      break;
    case "great":
      sentences.push(
        "It's the only move that holds the position together here — anything else lets the advantage slip away."
      );
      break;
    case "best":
      sentences.push("This matches the engine's top choice.");
      break;
    case "excellent":
      sentences.push("Very close to the computer's best line, with only a negligible cost.");
      break;
    case "good":
      sentences.push("A reasonable, solid move, though not the most precise available.");
      break;
    default:
      sentences.push(describeNonBestMove(input));
  }

  if (input.isCriticalMoment && input.classification !== "brilliant") {
    sentences.push(describeSwing(input));
  }

  return sentences.filter(Boolean).join(" ");
}

function describeWhatItDoes(input: ExplainInput): string {
  const mover = playerName(input.color);
  if (input.isCapture && input.capturedPiece) {
    return `${mover} plays ${input.san}, capturing the ${PIECE_NAMES[input.capturedPiece as keyof typeof PIECE_NAMES] ?? "piece"} on ${toSquareOf(input.uci)}${input.isCheck ? " with check" : ""}.`;
  }
  if (input.isCheck) {
    return `${mover} plays ${input.san}, giving check.`;
  }
  if (isCastle(input.san)) {
    return `${mover} castles${input.san === "O-O" ? " kingside" : " queenside"}, tucking the king away and connecting the rooks.`;
  }
  return `${mover} plays ${input.san}.`;
}

function describeBrilliant(): string {
  return "It's a real sacrifice — giving up material on purpose — but it's still objectively the strongest move on the board and hard to find over the board.";
}

function describeNonBestMove(input: ExplainInput): string {
  const better = input.evalBefore.bestMoveSan;
  const parts: string[] = [];

  const consequence = describeConsequence(input);
  if (consequence) parts.push(consequence);

  if (better && better !== input.san) {
    parts.push(`${betterWasPhrase(input.classification)}${better}${describeWhyBetter(input)}.`);
  }

  return parts.join(" ");
}

function betterWasPhrase(classification: Classification): string {
  switch (classification) {
    case "inaccuracy":
      return "Slightly more precise was ";
    case "mistake":
      return "Better was ";
    case "miss":
      return "This misses a much stronger continuation: ";
    case "blunder":
    default:
      return "The engine's top choice was ";
  }
}

function describeWhyBetter(input: ExplainInput): string {
  const line = input.evalBefore.bestLineSan;
  if (line.length > 1) {
    return `, continuing ${line.slice(0, 3).join(" ")}`;
  }
  return "";
}

/** Describes what the played move concretely hands the opponent, using the engine's
 *  suggested reply in the resulting position (hanging material, forks, mating nets). */
function describeConsequence(input: ExplainInput): string {
  const { fenAfter, evalAfter, color } = input;
  const opponent = opponentOf(color);
  const replyUci = evalAfter.bestMoveUci;
  const replySan = evalAfter.bestMoveSan;
  if (!replyUci || !replySan) {
    return genericSeverityPhrase(input);
  }

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
        return `This allows ${replySan}, putting ${playerName(color)} in a forced mating sequence.`;
      }
    }

    if (moveResult.isCapture() && moveResult.captured) {
      const capturedName = PIECE_NAMES[moveResult.captured];
      return `This ${input.isCapture ? "trade" : "move"} hangs the ${capturedName} to ${replySan}.`;
    }

    const targets = attackedEnemyPieces(chess.fen(), to, opponent).filter(
      (t) => t.value >= 3 && !t.defended
    );
    if (targets.length >= 2) {
      return `This walks into a fork — ${replySan} attacks ${targets.length} pieces at once.`;
    }
    if (targets.length === 1) {
      return `This leaves the ${PIECE_NAMES[targets[0].piece]} on ${targets[0].square} hanging after ${replySan}.`;
    }

    if (moveResult.san.includes("+") || moveResult.san.includes("#")) {
      return `This allows ${replySan} with check, seizing the initiative.`;
    }
  } catch {
    // fall through to generic phrase
  }

  return genericSeverityPhrase(input);
}

function genericSeverityPhrase(input: ExplainInput): string {
  switch (input.classification) {
    case "blunder":
      return "This hands over a decisive advantage.";
    case "mistake":
      return "This gives up a clear advantage.";
    case "miss":
      return "This lets a much stronger continuation slip away.";
    case "inaccuracy":
      return "This is a small imprecision that lets the position slip slightly.";
    default:
      return "";
  }
}

function describeSwing(input: ExplainInput): string {
  const before = cpToWinPercent(input.evalBefore.cp, "w");
  const after = cpToWinPercent(input.evalAfter.cp, "w");
  const swing = Math.abs(before - after);
  return `This is a turning point in the game — the win probability swings by about ${Math.round(swing)} percentage points.`;
}

function toSquareOf(uci: string): string {
  return uci.slice(2, 4);
}

function isCastle(san: string): boolean {
  return san === "O-O" || san === "O-O-O";
}
