"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysisSpeed, AnalyzeStreamEvent, GameAnalysis } from "@/lib/types";
import ImportPanel from "@/components/ImportPanel";
import BoardPanel from "@/components/BoardPanel";
import MoveList from "@/components/MoveList";
import EvalGraph from "@/components/EvalGraph";
import SummaryPanel from "@/components/SummaryPanel";
import KeyMomentsStrip from "@/components/KeyMomentsStrip";
import MoveExplanation from "@/components/MoveExplanation";
import { totalPlies } from "@/lib/gameAnalysisClient";

type Mode = "input" | "analyzing" | "review";

export default function GameReviewApp() {
  const [mode, setMode] = useState<Mode>("input");
  const [progress, setProgress] = useState<{ ply: number; total: number } | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">("white");

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
      if (e.key === "ArrowLeft") setCurrentPly((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight")
        setCurrentPly((p) => Math.min(analysis ? totalPlies(analysis) : 0, p + 1));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mode, analysis]);

  if (mode === "input" || mode === "analyzing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <h1 className="mb-1 text-2xl font-bold text-neutral-100">Game Review</h1>
        <p className="mb-8 text-sm text-neutral-400">
          Local, Stockfish-powered move-by-move game analysis.
        </p>
        {mode === "analyzing" ? (
          <AnalyzingState progress={progress} onCancel={() => setMode("input")} />
        ) : (
          <ImportPanel onSubmit={runAnalysis} />
        )}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-100">Game Review</h1>
        <button
          type="button"
          onClick={() => {
            setMode("input");
            setAnalysis(null);
          }}
          className="text-sm text-neutral-400 underline hover:text-neutral-200"
        >
          Review another game
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex flex-col gap-2 lg:w-[560px] lg:shrink-0">
          <BoardPanel analysis={analysis} currentPly={currentPly} orientation={orientation} />
          <NavBar
            currentPly={currentPly}
            total={totalPlies(analysis)}
            onSelectPly={setCurrentPly}
            onFlip={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
          />
          <EvalGraph analysis={analysis} currentPly={currentPly} onSelectPly={setCurrentPly} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <SummaryPanel analysis={analysis} />
          <KeyMomentsStrip analysis={analysis} currentPly={currentPly} onSelectPly={setCurrentPly} />
          <MoveExplanation analysis={analysis} currentPly={currentPly} />
          <MoveList analysis={analysis} currentPly={currentPly} onSelectPly={setCurrentPly} />
        </div>
      </div>
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
    <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-2">
      <div className="flex items-center gap-1.5">
        <NavButton onClick={() => onSelectPly(0)} disabled={currentPly === 0} label="First move">
          <SkipIcon direction="start" />
        </NavButton>
        <NavButton
          onClick={() => onSelectPly(Math.max(0, currentPly - 1))}
          disabled={currentPly === 0}
          label="Previous move"
        >
          <ChevronIcon direction="left" />
        </NavButton>
        <NavButton
          onClick={() => onSelectPly(Math.min(total, currentPly + 1))}
          disabled={currentPly === total}
          label="Next move"
        >
          <ChevronIcon direction="right" />
        </NavButton>
        <NavButton onClick={() => onSelectPly(total)} disabled={currentPly === total} label="Last move">
          <SkipIcon direction="end" />
        </NavButton>
        <span className="ml-1 hidden text-xs tabular-nums text-neutral-500 sm:inline">
          {currentPly} / {total}
        </span>
      </div>
      <button
        type="button"
        onClick={onFlip}
        className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
      >
        Flip board
      </button>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:border-neutral-500 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-neutral-700 disabled:hover:bg-neutral-800"
    >
      {children}
    </button>
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
    <div className="w-full max-w-md text-center">
      <p className="mb-3 text-sm text-neutral-300">
        Analyzing{progress ? ` — ${progress.ply}/${progress.total} positions` : "…"}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full bg-neutral-100 transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-xs text-neutral-500 underline hover:text-neutral-300"
      >
        Cancel
      </button>
    </div>
  );
}
