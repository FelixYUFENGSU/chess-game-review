"use client";

import { useEffect, useRef } from "react";
import type { GameAnalysis } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/types";

interface MoveListProps {
  analysis: GameAnalysis;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export default function MoveList({ analysis, currentPly, onSelectPly }: MoveListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-ply="${currentPly}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentPly]);

  const pairs: { moveNumber: number; white?: (typeof analysis.moves)[number]; black?: (typeof analysis.moves)[number] }[] = [];
  for (const move of analysis.moves) {
    let pair = pairs[pairs.length - 1];
    if (!pair || pair.moveNumber !== move.moveNumber) {
      pair = { moveNumber: move.moveNumber };
      pairs.push(pair);
    }
    if (move.color === "w") pair.white = move;
    else pair.black = move;
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[38vh] overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 lg:max-h-none lg:min-h-0 lg:flex-1"
    >
      <button
        type="button"
        data-ply={0}
        onClick={() => onSelectPly(0)}
        className={`block w-full px-3 py-1.5 text-left text-xs text-neutral-400 hover:bg-neutral-800 ${
          currentPly === 0 ? "bg-neutral-800" : ""
        }`}
      >
        Starting position
      </button>
      {pairs.map((pair) => (
        <div key={pair.moveNumber} className="flex items-stretch text-sm">
          <span className="w-8 shrink-0 select-none py-1.5 pl-2 text-neutral-500">
            {pair.moveNumber}.
          </span>
          <MoveCell move={pair.white} currentPly={currentPly} onSelectPly={onSelectPly} />
          <MoveCell move={pair.black} currentPly={currentPly} onSelectPly={onSelectPly} />
        </div>
      ))}
    </div>
  );
}

function MoveCell({
  move,
  currentPly,
  onSelectPly,
}: {
  move: GameAnalysis["moves"][number] | undefined;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}) {
  if (!move) return <span className="flex-1" />;
  const info = CLASSIFICATION_INFO[move.classification];
  const isCurrent = currentPly === move.ply;
  return (
    <button
      type="button"
      data-ply={move.ply}
      onClick={() => onSelectPly(move.ply)}
      className={`flex flex-1 items-center gap-1 px-2 py-1.5 text-left font-medium hover:bg-neutral-800 ${
        isCurrent ? "bg-neutral-700" : ""
      }`}
    >
      {move.isCriticalMoment && <span className="text-amber-400">◆</span>}
      <span className="text-neutral-100">{move.san}</span>
      {info.symbol && (
        <span className="text-xs font-bold" style={{ color: info.color }}>
          {info.symbol}
        </span>
      )}
    </button>
  );
}
