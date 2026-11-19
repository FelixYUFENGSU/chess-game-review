"use client";

import { useEffect, useRef } from "react";
import type { AnalyzedMove, Classification, GameAnalysis } from "@/lib/types";
import ClassificationIcon from "@/components/ClassificationIcon";

interface MoveListProps {
  analysis: GameAnalysis;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

/** Classifications worth an icon next to the move; routine moves stay clean. */
const SHOW_ICON: Classification[] = ["brilliant", "great", "best", "inaccuracy", "mistake", "miss", "blunder", "book"];

export default function MoveList({ analysis, currentPly, onSelectPly }: MoveListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-ply="${currentPly}"]`);
    if (!container || !el) return;
    // Scroll only the list (never the page) so stepping through moves doesn't jump the layout.
    const top = el.offsetTop - container.offsetTop;
    if (top < container.scrollTop) container.scrollTop = top - 8;
    else if (top + el.offsetHeight > container.scrollTop + container.clientHeight)
      container.scrollTop = top + el.offsetHeight - container.clientHeight + 8;
  }, [currentPly]);

  const pairs: { moveNumber: number; white?: AnalyzedMove; black?: AnalyzedMove }[] = [];
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
    <div ref={containerRef} className="panel-scroll relative min-h-0 flex-1 overflow-y-auto">
      {pairs.map((pair, i) => (
        <div
          key={pair.moveNumber}
          className={`grid grid-cols-[2.5rem_1fr_1fr] items-center text-[15px] ${
            i % 2 === 0 ? "bg-transparent" : "bg-white/[0.025]"
          }`}
        >
          <span className="select-none py-1 pl-3 text-cg-faint">{pair.moveNumber}.</span>
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
  move: AnalyzedMove | undefined;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}) {
  if (!move) return <span />;
  const isCurrent = currentPly === move.ply;
  const showIcon = SHOW_ICON.includes(move.classification);
  return (
    <button
      type="button"
      data-ply={move.ply}
      onClick={() => onSelectPly(move.ply)}
      title={move.coach.headline}
      className={`mr-2 flex items-center gap-1.5 rounded px-2 py-1 text-left font-semibold transition-colors ${
        isCurrent ? "bg-cg-panel3 text-white" : "text-cg-muted hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="w-4">{showIcon && <ClassificationIcon classification={move.classification} size={16} />}</span>
      <span>{move.san}</span>
    </button>
  );
}
