import type { GameAnalysis } from "@/lib/types";

/**
 * Generates a short, plain-English narrative overview of the whole game —
 * opening, accuracy comparison, standout moves, the turning point, and how it
 * ended. Purely templated from already-computed stats, same approach as the
 * per-move explanations (no LLM call, fully deterministic).
 */
export function generateGameSummary(analysis: GameAnalysis): string {
  const { white, black, opening, moves, keyMoments } = analysis;
  if (moves.length === 0) return "No moves to review.";

  const sentences: string[] = [];

  if (opening) {
    sentences.push(`The game opened with the ${opening.name} (${opening.eco}).`);
  }

  const accDiff = Math.abs(white.summary.accuracy - black.summary.accuracy);
  if (accDiff < 3) {
    sentences.push(
      `Both sides played with similar precision — ${white.name} at ${fmtPct(white.summary.accuracy)} accuracy and ${black.name} at ${fmtPct(black.summary.accuracy)}.`
    );
  } else {
    const moreAccurate = white.summary.accuracy > black.summary.accuracy ? white.name : black.name;
    sentences.push(
      `${moreAccurate} was the more precise player overall, ${fmtPct(white.summary.accuracy)} to ${fmtPct(black.summary.accuracy)}.`
    );
  }

  const whiteErrors = errorCount(white.summary.counts);
  const blackErrors = errorCount(black.summary.counts);
  if (whiteErrors === 0 && blackErrors === 0) {
    sentences.push("Neither side made a real mistake — a clean, well-played game.");
  } else {
    const parts: string[] = [];
    if (whiteErrors > 0) parts.push(`${white.name} had ${whiteErrors} significant error${whiteErrors === 1 ? "" : "s"}`);
    if (blackErrors > 0) parts.push(`${black.name} had ${blackErrors}`);
    sentences.push(parts.join(whiteErrors > 0 && blackErrors > 0 ? " while " : "") + ".");
  }

  const whiteBrilliant = white.summary.counts.brilliant;
  const blackBrilliant = black.summary.counts.brilliant;
  if (whiteBrilliant + blackBrilliant > 0) {
    const parts: string[] = [];
    if (whiteBrilliant > 0)
      parts.push(`${white.name} found ${whiteBrilliant} brilliant move${whiteBrilliant === 1 ? "" : "s"}`);
    if (blackBrilliant > 0) parts.push(`${black.name} found ${blackBrilliant}`);
    sentences.push(parts.join(" and ") + ".");
  }

  if (keyMoments.length > 0) {
    const turningPoint = [...moves]
      .filter((m) => keyMoments.includes(m.ply))
      .sort((a, b) => b.winPercentLossMoverPov - a.winPercentLossMoverPov)[0];
    if (turningPoint && turningPoint.winPercentLossMoverPov > 5) {
      sentences.push(
        `The critical turning point came with ${turningPoint.moveNumber}${turningPoint.color === "w" ? "." : "..."} ${turningPoint.san}: ${lowerFirst(turningPoint.explanation)}`
      );
    } else if (keyMoments.length === 1) {
      sentences.push("There was one key moment that shaped the outcome.");
    } else {
      sentences.push(`There were ${keyMoments.length} key moments that shaped the outcome.`);
    }
  }

  const result = describeResult(analysis);
  if (result) sentences.push(result);

  return sentences.join(" ");
}

function errorCount(counts: GameAnalysis["white"]["summary"]["counts"]): number {
  return counts.blunder + counts.mistake + counts.miss;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function lowerFirst(s: string): string {
  return s.length > 0 ? s[0].toLowerCase() + s.slice(1) : s;
}

function describeResult(analysis: GameAnalysis): string {
  const lastMove = analysis.moves[analysis.moves.length - 1];
  if (lastMove?.isCheckmate) {
    const winner = lastMove.color === "w" ? analysis.white.name : analysis.black.name;
    return `${winner} delivered checkmate to end the game.`;
  }

  const termination = analysis.headers.Termination?.trim();
  if (termination) return /[.!?]$/.test(termination) ? termination : `${termination}.`;

  switch (analysis.headers.Result) {
    case "1-0":
      return `${analysis.white.name} won the game.`;
    case "0-1":
      return `${analysis.black.name} won the game.`;
    case "1/2-1/2":
      return "The game ended in a draw.";
    default:
      return "";
  }
}
