"use client";

import { Chessboard } from "react-chessboard";
import type { GameAnalysis } from "@/lib/types";
import { fenAtPly } from "@/lib/gameAnalysisClient";
import EvalBar from "@/components/EvalBar";
import ClassificationIcon from "@/components/ClassificationIcon";

interface LinePreview {
  fen: string;
  uci: string;
  index: number;
  total: number;
  onExit: () => void;
}

interface BoardPanelProps {
  analysis: GameAnalysis;
  currentPly: number;
  orientation: "white" | "black";
  /** When set, the board shows a position from the engine's best line instead of the game. */
  preview?: LinePreview;
}

const BEST_ARROW_COLOR = "rgba(150, 190, 70, 0.85)";
const LAST_MOVE_COLOR = "rgba(255, 255, 51, 0.42)";
const LINE_MOVE_COLOR = "rgba(110, 170, 230, 0.5)";
const FILES = "abcdefgh";

export default function BoardPanel({ analysis, currentPly, orientation, preview }: BoardPanelProps) {
  const fen = preview ? preview.fen : fenAtPly(analysis, currentPly);
  const move = !preview && currentPly > 0 ? analysis.moves[currentPly - 1] : undefined;
  const evalPoint = analysis.evalSeries[Math.min(currentPly, analysis.evalSeries.length - 1)];

  // Show the engine's better move as an arrow only when the played move wasn't (close to) it.
  const showBestArrow =
    move &&
    move.evalBefore.bestMoveUci &&
    move.uci !== move.evalBefore.bestMoveUci &&
    !["best", "brilliant", "great", "book"].includes(move.classification);

  const arrows = showBestArrow
    ? [
        {
          startSquare: move.evalBefore.bestMoveUci!.slice(0, 2),
          endSquare: move.evalBefore.bestMoveUci!.slice(2, 4),
          color: BEST_ARROW_COLOR,
        },
      ]
    : [];

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (move) {
    squareStyles[move.uci.slice(0, 2)] = { backgroundColor: LAST_MOVE_COLOR };
    squareStyles[move.uci.slice(2, 4)] = { backgroundColor: LAST_MOVE_COLOR };
  } else if (preview) {
    squareStyles[preview.uci.slice(0, 2)] = { backgroundColor: LINE_MOVE_COLOR };
    squareStyles[preview.uci.slice(2, 4)] = { backgroundColor: LINE_MOVE_COLOR };
  }

  // Position of the classification badge: top-right corner of the destination square.
  let badge: { left: string; top: string } | null = null;
  if (move) {
    const to = move.uci.slice(2, 4);
    const file = FILES.indexOf(to[0]);
    const rank = Number(to[1]) - 1;
    const col = orientation === "white" ? file : 7 - file;
    const row = orientation === "white" ? 7 - rank : rank;
    badge = { left: `${((col + 1) / 8) * 100}%`, top: `${(row / 8) * 100}%` };
  }

  const top = orientation === "white" ? "b" : "w";
  const bottom = orientation === "white" ? "w" : "b";

  return (
    <div className="flex w-full flex-col gap-1.5">
      {preview ? (
        <div className="flex h-7 items-center gap-2 pl-[calc(2.25rem+0.375rem)] text-sm font-semibold">
          <span className="rounded bg-[#4a7fb5] px-2 py-0.5 text-white">Engine line</span>
          <span className="tabular-nums text-cg-faint">
            move {preview.index + 1} of {preview.total}
          </span>
          <span className="hidden text-xs font-normal text-cg-faint sm:inline">← → to step · Esc to exit</span>
          <button
            type="button"
            onClick={preview.onExit}
            className="ml-auto rounded-md bg-cg-panel3 px-2.5 py-1 text-xs text-white hover:bg-[#4a4844]"
          >
            Back to game
          </button>
        </div>
      ) : (
        <PlayerBar analysis={analysis} color={top} />
      )}
      <div className="flex items-stretch gap-1.5">
        <EvalBar cp={evalPoint?.cp ?? 0} mate={evalPoint?.mate ?? null} orientation={orientation} />
        <div className="relative aspect-square w-full">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              arrows,
              squareStyles,
              allowDragging: false,
              allowDrawingArrows: false,
              showAnimations: true,
              animationDurationInMs: 180,
              id: "review-board",
              boardStyle: { borderRadius: 4, overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,.35)" },
              lightSquareStyle: { backgroundColor: "#ebecd0" },
              darkSquareStyle: { backgroundColor: "#739552" },
              lightSquareNotationStyle: { color: "#739552", fontWeight: 700 },
              darkSquareNotationStyle: { color: "#ebecd0", fontWeight: 700 },
            }}
          />
          {move && badge && (
            <div
              key={move.ply}
              className="pop-in pointer-events-none absolute z-10"
              style={{ left: badge.left, top: badge.top, transform: "translate(-62%, -38%)" }}
            >
              <ClassificationIcon classification={move.isCheckmate ? "best" : move.classification} size={28} />
            </div>
          )}
        </div>
      </div>
      <PlayerBar analysis={analysis} color={bottom} />
    </div>
  );
}

function PlayerBar({ analysis, color }: { analysis: GameAnalysis; color: "w" | "b" }) {
  const player = color === "w" ? analysis.white : analysis.black;
  const elo = analysis.headers[color === "w" ? "WhiteElo" : "BlackElo"];
  return (
    <div className="flex items-center gap-2 pl-[calc(2.25rem+0.375rem)]">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded text-base ${
          color === "w" ? "bg-[#f0f0f0] text-[#302e2b]" : "bg-[#1b1a18] text-[#f0f0f0]"
        }`}
        aria-hidden="true"
      >
        ♚
      </span>
      <span className="truncate text-sm font-semibold text-cg-text">{player.name}</span>
      {elo && elo !== "?" && <span className="text-sm text-cg-faint">({elo})</span>}
    </div>
  );
}
