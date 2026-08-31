"use client";

import { useMemo } from "react";
import type { GameAnalysis } from "@/lib/types";
import { generateGameSummary } from "@/lib/chess/gameSummary";

interface GameSummaryCardProps {
  analysis: GameAnalysis;
}

/** Shown once the user reaches the last move — a narrative wrap-up of the whole game. */
export default function GameSummaryCard({ analysis }: GameSummaryCardProps) {
  const summary = useMemo(() => generateGameSummary(analysis), [analysis]);

  return (
    <div className="min-h-[108px] rounded-md border border-amber-500/40 bg-gradient-to-br from-neutral-900 to-neutral-900/60 p-3">
      <div className="flex items-center gap-2">
        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
          Game Summary
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-200">{summary}</p>
    </div>
  );
}
