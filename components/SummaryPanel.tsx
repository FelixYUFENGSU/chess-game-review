"use client";

import type { GameAnalysis } from "@/lib/types";
import { CLASSIFICATION_INFO, CLASSIFICATIONS } from "@/lib/types";

interface SummaryPanelProps {
  analysis: GameAnalysis;
}

export default function SummaryPanel({ analysis }: SummaryPanelProps) {
  const { white, black, opening } = analysis;

  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-900 p-3">
      <div className="flex items-center justify-between gap-4">
        <PlayerScore label={white.name} color="white" accuracy={white.summary.accuracy} />
        <span className="text-xs text-neutral-500">vs</span>
        <PlayerScore label={black.name} color="black" accuracy={black.summary.accuracy} />
      </div>
      {opening && (
        <p className="mt-2 text-center text-xs text-neutral-400">
          {opening.eco} · {opening.name}
        </p>
      )}
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 border-t border-neutral-800 pt-2 sm:grid-cols-2">
        {CLASSIFICATIONS.filter((c) => white.summary.counts[c] + black.summary.counts[c] > 0).map(
          (c) => (
            <div key={c} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CLASSIFICATION_INFO[c].color }}
                />
                <span className="text-neutral-300">{CLASSIFICATION_INFO[c].label}</span>
              </span>
              <span className="tabular-nums text-neutral-400">
                {white.summary.counts[c]} – {black.summary.counts[c]}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function PlayerScore({
  label,
  color,
  accuracy,
}: {
  label: string;
  color: "white" | "black";
  accuracy: number;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <span
        className={`inline-block h-3 w-3 shrink-0 rounded-full border border-neutral-500 ${
          color === "white" ? "bg-neutral-100" : "bg-neutral-900"
        }`}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-100">{label}</p>
        <p className="text-xs text-neutral-400">{accuracy.toFixed(1)}% accuracy</p>
      </div>
    </div>
  );
}
