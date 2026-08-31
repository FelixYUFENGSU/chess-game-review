import { Chess, type Square } from "chess.js";
import { parsePgn } from "@/lib/chess/pgn";
import { findOpening } from "@/lib/chess/openings";
import { classifyMove } from "@/lib/chess/classify";
import { explainMove } from "@/lib/chess/explain";
import { moveAccuracy, gameAccuracy, cpToWinPercent } from "@/lib/chess/winPercent";
import { getSharedEngine, speedToEngineOptions } from "@/lib/engine/stockfish";
import {
  CLASSIFICATIONS,
  type AnalysisSpeed,
  type AnalyzeStreamEvent,
  type AnalyzedMove,
  type Classification,
  type GameAnalysis,
  type PlayerSummary,
  type PositionEval,
} from "@/lib/types";

const CRITICAL_SWING_THRESHOLD = 15; // percentage points of White win% swing

function emptyCounts(): Record<Classification, number> {
  const counts = {} as Record<Classification, number>;
  for (const c of CLASSIFICATIONS) counts[c] = 0;
  return counts;
}

export async function* analyzeGame(
  pgn: string,
  speed: AnalysisSpeed
): AsyncGenerator<AnalyzeStreamEvent, void, unknown> {
  const parsed = parsePgn(pgn);
  const engineOptions = speedToEngineOptions(speed);
  const engine = getSharedEngine();

  const sanList = parsed.moves.map((m) => m.san);
  const openingResult = findOpening(sanList);
  const bookPlies = openingResult?.bookPlies ?? 0;

  const positionEvals: PositionEval[] = [];
  const totalPositions = parsed.fens.length;
  for (let i = 0; i < totalPositions; i++) {
    const evalResult = await engine.evaluate(parsed.fens[i], engineOptions);
    positionEvals.push(evalResult);
    yield { type: "progress", ply: i, total: totalPositions - 1 };
  }

  const analyzedMoves: AnalyzedMove[] = [];
  const perMoveAcc: Record<"w" | "b", number[]> = { w: [], b: [] };
  const counts: Record<"w" | "b", Record<Classification, number>> = {
    w: emptyCounts(),
    b: emptyCounts(),
  };
  const keyMoments: number[] = [];

  for (let i = 0; i < parsed.moves.length; i++) {
    const move = parsed.moves[i];
    const evalBefore = positionEvals[i];
    const evalAfter = positionEvals[i + 1];
    const isBook = move.ply <= bookPlies;

    const toSquare = move.uci.slice(2, 4) as Square;
    const movedPiece = new Chess(move.fenAfter).get(toSquare)?.type ?? "p";

    const classifyResult = classifyMove({
      color: move.color,
      sanPlayed: move.san,
      uciPlayed: move.uci,
      fenAfter: move.fenAfter,
      toSquare,
      movedPiece,
      capturedByMove: move.capturedPiece,
      evalBefore,
      evalAfter,
      isBook,
      isCheckmate: move.isCheckmate,
      ply: move.ply,
    });

    const accuracy = moveAccuracy(
      classifyResult.winPercentBeforeMoverPov,
      classifyResult.winPercentAfterMoverPov
    );
    perMoveAcc[move.color].push(accuracy);
    counts[move.color][classifyResult.classification]++;

    const whiteWinBefore = cpToWinPercent(evalBefore.cp, "w");
    const whiteWinAfter = cpToWinPercent(evalAfter.cp, "w");
    const swing = Math.abs(whiteWinAfter - whiteWinBefore);
    const isCriticalMoment =
      swing >= CRITICAL_SWING_THRESHOLD ||
      classifyResult.classification === "blunder" ||
      classifyResult.classification === "miss" ||
      classifyResult.classification === "brilliant";

    const explanation = explainMove({
      san: move.san,
      uci: move.uci,
      color: move.color,
      ply: move.ply,
      classification: classifyResult.classification,
      isCapture: move.isCapture,
      isCheck: move.isCheck,
      isCheckmate: move.isCheckmate,
      capturedPiece: move.capturedPiece,
      fenBefore: move.fenBefore,
      fenAfter: move.fenAfter,
      evalBefore,
      evalAfter,
      isBook,
      isCriticalMoment,
      openingName: isBook ? openingResult?.opening.name : undefined,
    });

    const analyzed: AnalyzedMove = {
      ...move,
      evalBefore,
      evalAfter,
      classification: classifyResult.classification,
      cpLossMoverPov: classifyResult.cpLossMoverPov,
      winPercentBeforeMoverPov: classifyResult.winPercentBeforeMoverPov,
      winPercentAfterMoverPov: classifyResult.winPercentAfterMoverPov,
      winPercentLossMoverPov: classifyResult.winPercentLossMoverPov,
      isBook,
      isCriticalMoment,
      explanation,
    };

    analyzedMoves.push(analyzed);
    if (isCriticalMoment) keyMoments.push(move.ply);
  }

  const white: { name: string; summary: PlayerSummary } = {
    name: parsed.headers.White ?? "White",
    summary: { accuracy: gameAccuracy(perMoveAcc.w), counts: counts.w },
  };
  const black: { name: string; summary: PlayerSummary } = {
    name: parsed.headers.Black ?? "Black",
    summary: { accuracy: gameAccuracy(perMoveAcc.b), counts: counts.b },
  };

  const analysis: GameAnalysis = {
    headers: parsed.headers,
    white,
    black,
    moves: analyzedMoves,
    evalSeries: positionEvals.map((e, i) => ({ ply: i, cp: e.cp, mate: e.mate })),
    keyMoments,
    opening: openingResult?.opening ?? null,
    engineOptions,
  };

  yield { type: "done", analysis };
}
