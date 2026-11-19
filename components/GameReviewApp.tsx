"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysisSpeed, AnalyzeStreamEvent, GameAnalysis } from "@/lib/types";
import { Chessboard } from "react-chessboard";
import ImportPanel from "@/components/ImportPanel";
import BoardPanel from "@/components/BoardPanel";
import MoveList from "@/components/MoveList";
import EvalGraph from "@/components/EvalGraph";
import CoachPanel from "@/components/CoachPanel";
import { bestLineFor, lineSteps, totalPlies } from "@/lib/gameAnalysisClient";

type Mode = "input" | "analyzing" | "review";

export default function GameReviewApp() {
  const [mode, setMode] = useState<Mode>("input");
  const [progress, setProgress] = useState<{ ply: number; total: number } | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  // When set, the board shows the engine's best line from before move `currentPly`,
  // `lineIndex` moves deep (0 = after the first move of the line).
  const [lineIndex, setLineIndex] = useState<number | null>(null);

  const goToPly = useCallback((ply: number | ((p: number) => number)) => {
    setLineIndex(null);
    setCurrentPly(ply);
  }, []);

  const runAnalysis = useCallback(async (pgn: string, speed: AnalysisSpeed) => {
    setMode("analyzing");
    setError(null);
    setProgress(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pgn, speed }),
      });
      if (!res.body) throw new Error("No response body from server.");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? data?.error ?? "Analysis failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event: AnalyzeStreamEvent = JSON.parse(line);
          if (event.type === "progress") {
            setProgress({ ply: event.ply, total: event.total });
          } else if (event.type === "done") {
            setAnalysis(event.analysis);
            setCurrentPly(0);
            setLineIndex(null);
            setMode("review");
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setMode("input");
    }
  }, []);

  useEffect(() => {
    if (mode !== "review") return;
    function handleKey(e: KeyboardEvent) {
      const last = analysis ? totalPlies(analysis) : 0;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (lineIndex !== null && analysis) {
        // Stepping through an engine line: arrows move within the line, Esc returns to the game.
        const lineLength = bestLineFor(analysis.moves[currentPly - 1]).length;
        if (e.key === "ArrowLeft") setLineIndex(lineIndex === 0 ? null : lineIndex - 1);
        else if (e.key === "ArrowRight") setLineIndex(Math.min(lineLength - 1, lineIndex + 1));
        else if (e.key === "Escape") setLineIndex(null);
        else return;
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowLeft") goToPly((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") goToPly((p) => Math.min(last, p + 1));
      else if (e.key === "Home" || e.key === "ArrowUp") goToPly(0);
      else if (e.key === "End" || e.key === "ArrowDown") goToPly(last);
      else if (e.key.toLowerCase() === "f") setOrientation((o) => (o === "white" ? "black" : "white"));
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mode, analysis, lineIndex, currentPly, goToPly]);

  if (mode === "input" || mode === "analyzing") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <div className="hidden lg:block">
            <HeroBoard />
          </div>
          <div className="rounded-xl bg-cg-panel p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cg-green text-2xl text-white">
                ★
              </span>
              <div>
                <h1 className="text-2xl font-extrabold text-cg-text">Game Review</h1>
                <p className="text-sm text-cg-muted">See what went right, what went wrong, and why.</p>
              </div>
            </div>
            {mode === "analyzing" ? (
              <AnalyzingState progress={progress} onCancel={() => setMode("input")} />
            ) : (
              <ImportPanel onSubmit={runAnalysis} />
            )}
            {error && <p className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const total = totalPlies(analysis);
  const currentMove = currentPly > 0 ? analysis.moves[currentPly - 1] : undefined;
  const steps =
    lineIndex !== null && currentMove ? lineSteps(currentMove.fenBefore, bestLineFor(currentMove)) : [];
  const preview =
    lineIndex !== null && steps[lineIndex]
      ? {
          fen: steps[lineIndex].fen,
          uci: steps[lineIndex].uci,
          index: lineIndex,
          total: steps.length,
          onExit: () => setLineIndex(null),
        }
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-3 lg:h-dvh lg:flex-row lg:items-stretch lg:justify-center lg:overflow-hidden lg:p-5">
      <div className="mx-auto w-full max-w-[min(640px,calc(100dvh-7rem))] shrink-0 lg:mx-0 lg:w-[min(640px,calc(100dvh-7rem))]">
        <BoardPanel analysis={analysis} currentPly={currentPly} orientation={orientation} preview={preview} />
      </div>

      <aside className="flex min-h-[520px] w-full flex-col overflow-hidden rounded-lg bg-cg-panel shadow-xl lg:min-h-0 lg:w-[420px]">
        <header className="flex shrink-0 items-center gap-2 border-b border-black/30 px-4 py-3">
          <span className="text-lg text-cg-green">★</span>
          <h1 className="text-base font-bold text-cg-text">Game Review</h1>
          <button
            type="button"
            onClick={() => {
              setMode("input");
              setAnalysis(null);
            }}
            className="ml-auto rounded-md px-2 py-1 text-xs font-semibold text-cg-muted hover:bg-white/5 hover:text-white"
          >
            New game
          </button>
        </header>

        {/* Before the first move the panel is an overview of the whole game;
            once the review starts it becomes coach + graph + move list. */}
        <div
          className={`panel-scroll overflow-y-auto px-4 pt-3 pb-2 ${
            currentPly === 0 ? "flex-1" : "shrink-0 lg:max-h-[58%]"
          }`}
        >
          <CoachPanel
            analysis={analysis}
            currentPly={currentPly}
            onSelectPly={goToPly}
            lineIndex={lineIndex}
            onSelectLine={setLineIndex}
          />
        </div>

        {currentPly > 0 && (
          <>
            <div className="shrink-0 px-4 pb-2">
              <EvalGraph analysis={analysis} currentPly={currentPly} onSelectPly={goToPly} />
            </div>
            <div className="flex min-h-[160px] flex-1 flex-col border-t border-black/30 lg:min-h-0">
              <MoveList analysis={analysis} currentPly={currentPly} onSelectPly={goToPly} />
            </div>
          </>
        )}

        <NavBar
          currentPly={currentPly}
          total={total}
          onSelectPly={goToPly}
          onFlip={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
        />
      </aside>
    </div>
  );
}

function NavBar({
  currentPly,
  total,
  onSelectPly,
  onFlip,
}: {
  currentPly: number;
  total: number;
  onSelectPly: (ply: number) => void;
  onFlip: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-t border-black/30 bg-cg-panel2 p-2">
      <NavButton onClick={onFlip} label="Flip board (F)" small>
        <FlipIcon />
      </NavButton>
      <NavButton onClick={() => onSelectPly(0)} disabled={currentPly === 0} label="Start (Home)">
        <SkipIcon direction="start" />
      </NavButton>
      <NavButton
        onClick={() => onSelectPly(Math.max(0, currentPly - 1))}
        disabled={currentPly === 0}
        label="Previous move (←)"
      >
        <ChevronIcon direction="left" />
      </NavButton>
      <NavButton
        onClick={() => onSelectPly(Math.min(total, currentPly + 1))}
        disabled={currentPly === total}
        label="Next move (→)"
        primary
      >
        <ChevronIcon direction="right" />
      </NavButton>
      <NavButton onClick={() => onSelectPly(total)} disabled={currentPly === total} label="End (End)">
        <SkipIcon direction="end" />
      </NavButton>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  primary,
  small,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  primary?: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-11 items-center justify-center rounded-md text-white transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        small ? "w-11" : "flex-1"
      } ${
        primary
          ? "bg-cg-green shadow-[0_3px_0_0_var(--color-cg-green-shadow)] hover:bg-cg-green-hover disabled:hover:bg-cg-green"
          : "bg-cg-panel3 hover:bg-[#4a4844] disabled:hover:bg-cg-panel3"
      }`}
    >
      {children}
    </button>
  );
}

function FlipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4v13m0 0-3-3m3 3 3-3M17 20V7m0 0-3 3m3-3 3 3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SkipIcon({ direction }: { direction: "start" | "end" }) {
  const barX = direction === "start" ? 6 : 17;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "start" ? "M18 6l-8 6 8 6" : "M6 6l8 6-8 6"}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={barX} y="5" width="2" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

function AnalyzingState({
  progress,
  onCancel,
}: {
  progress: { ply: number; total: number } | null;
  onCancel: () => void;
}) {
  const pct = progress && progress.total > 0 ? (progress.ply / progress.total) * 100 : 0;
  return (
    <div className="py-4 text-center">
      <p className="mb-1 text-base font-semibold text-cg-text">Reviewing your game…</p>
      <p className="mb-4 text-sm text-cg-muted">
        {progress ? `Position ${progress.ply} of ${progress.total}` : "Starting the engine"}
      </p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-cg-panel2">
        <div
          className="h-full rounded-full bg-cg-green transition-[width] duration-200"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-5 text-sm font-semibold text-cg-faint hover:text-cg-text"
      >
        Cancel
      </button>
    </div>
  );
}

/** Decorative board for the landing page. */
function HeroBoard() {
  return (
    <div className="mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-md shadow-2xl">
      <Chessboard
        options={{
          id: "hero-board",
          position: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
          allowDragging: false,
          allowDrawingArrows: false,
          showNotation: false,
          arrows: [{ startSquare: "h5", endSquare: "f7", color: "rgba(150, 190, 70, 0.85)" }],
          squareStyles: { f7: { backgroundColor: "rgba(255, 255, 51, 0.42)" } },
          lightSquareStyle: { backgroundColor: "#ebecd0" },
          darkSquareStyle: { backgroundColor: "#739552" },
        }}
      />
    </div>
  );
}
