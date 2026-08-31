"use client";

import { Chessboard } from "react-chessboard";
import type { GameAnalysis } from "@/lib/types";
import { fenAtPly } from "@/lib/gameAnalysisClient";
import EvalBar from "@/components/EvalBar";

interface BoardPanelProps {
  analysis: GameAnalysis;
  currentPly: number;
  orientation: "white" | "black";
}

const PLAYED_ARROW_COLOR = "#3b82f6";
const BEST_ARROW_COLOR = "#22c55e";

export default function BoardPanel({ analysis, currentPly, orientation }: BoardPanelProps) {
  const fen = fenAtPly(analysis, currentPly);
  const move = currentPly > 0 ? analysis.moves[currentPly - 1] : undefined;
  const evalPoint = analysis.evalSeries[Math.min(currentPly, analysis.evalSeries.length - 1)];

  const showBestArrow =
    move && move.uci !== move.evalBefore.bestMoveUci && move.evalBefore.bestMoveUci;

  const arrows = [
    ...(move
      ? [
          {
            startSquare: move.uci.slice(0, 2),
            endSquare: move.uci.slice(2, 4),
            color: PLAYED_ARROW_COLOR,
          },
        ]
      : []),
    ...(showBestArrow
      ? [
          {
            startSquare: move.evalBefore.bestMoveUci!.slice(0, 2),
            endSquare: move.evalBefore.bestMoveUci!.slice(2, 4),
            color: BEST_ARROW_COLOR,
          },
        ]
      : []),
  ];

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (move) {
    const from = move.uci.slice(0, 2);
    const to = move.uci.slice(2, 4);
    squareStyles[from] = { backgroundColor: "rgba(59, 130, 246, 0.25)" };
    squareStyles[to] = { backgroundColor: "rgba(59, 130, 246, 0.35)" };
  }

  return (
    <div className="flex items-stretch gap-2">
      <EvalBar cp={evalPoint?.cp ?? 0} mate={evalPoint?.mate ?? null} orientation={orientation} />
      <div className="aspect-square w-full max-w-[560px]">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            arrows,
            squareStyles,
            allowDragging: false,
            showAnimations: true,
            animationDurationInMs: 200,
            id: "review-board",
          }}
        />
      </div>
    </div>
  );
}
