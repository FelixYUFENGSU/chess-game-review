"use client";

import type { GameAnalysis } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/types";

interface MoveExplanationProps {
  analysis: GameAnalysis;
  currentPly: number;
}

export default function MoveExplanation({ analysis, currentPly }: MoveExplanationProps) {
  if (currentPly === 0) {
    return (
      <div className="min-h-[108px] rounded-md border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-400">
        Starting position. Step through the moves to see the review.
      </div>
    );
  }

  const move = analysis.moves[currentPly - 1];
  if (!move) return null;
  const info = CLASSIFICATION_INFO[move.classification];
  const mover = move.color === "w" ? analysis.white.name : analysis.black.name;

  return (
    <div className="min-h-[108px] rounded-md border border-neutral-700 bg-neutral-900 p-3">
      <div className="flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-xs font-bold text-neutral-950"
          style={{ backgroundColor: info.color }}
        >
          {info.symbol ? `${info.symbol} ` : ""}
          {info.label}
        </span>
        <span className="text-sm font-semibold text-neutral-100">
          {move.moveNumber}
          {move.color === "w" ? "." : "..."} {move.san}
        </span>
        <span className="text-xs text-neutral-500">— {mover}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-200">{move.explanation}</p>
      {!move.isBook && (
        <p className="mt-2 text-xs text-neutral-500">
          Eval: {formatEval(move.evalBefore.cp, move.evalBefore.mate)} →{" "}
          {formatEval(move.evalAfter.cp, move.evalAfter.mate)}
        </p>
      )}
    </div>
  );
}

function formatEval(cp: number, mate: number | null): string {
  if (mate != null) return `M${Math.abs(mate)}`;
  const pawns = cp / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}
