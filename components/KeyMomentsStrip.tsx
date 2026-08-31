"use client";

import type { GameAnalysis } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/types";

interface KeyMomentsStripProps {
  analysis: GameAnalysis;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export default function KeyMomentsStrip({ analysis, currentPly, onSelectPly }: KeyMomentsStripProps) {
  if (analysis.keyMoments.length === 0) return null;

  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900 p-2">
      <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Key moments
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {analysis.keyMoments.map((ply) => {
          const move = analysis.moves[ply - 1];
          const info = CLASSIFICATION_INFO[move.classification];
          const isCurrent = currentPly === ply;
          return (
            <button
              key={ply}
              type="button"
              onClick={() => onSelectPly(ply)}
              className={`flex shrink-0 flex-col items-start rounded border px-2 py-1 text-left text-xs transition-colors ${
                isCurrent
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-neutral-700 bg-neutral-800 hover:border-neutral-500"
              }`}
              title={move.explanation}
            >
              <span className="font-semibold" style={{ color: info.color }}>
                {move.color === "w" ? move.moveNumber + "." : move.moveNumber + "..."} {move.san}
              </span>
              <span className="text-neutral-400">{info.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
