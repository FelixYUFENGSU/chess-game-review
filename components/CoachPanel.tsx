"use client";

import { useMemo, useState } from "react";
import type { AnalyzedMove, Classification, GameAnalysis } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/types";
import { generateGameSummary } from "@/lib/chess/gameSummary";
import ClassificationIcon from "@/components/ClassificationIcon";
import EvalGraph from "@/components/EvalGraph";

interface CoachPanelProps {
  analysis: GameAnalysis;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

/** The coach area of the review: overview before the first move, a speech-bubble
 *  breakdown for each move, and a wrap-up after the last one. */
export default function CoachPanel({ analysis, currentPly, onSelectPly }: CoachPanelProps) {
  const total = analysis.moves.length;
  if (currentPly === 0) return <Overview analysis={analysis} onSelectPly={onSelectPly} />;
  const move = analysis.moves[currentPly - 1];
  if (!move) return null;
  return (
    <div className="space-y-2">
      <OpeningRow analysis={analysis} move={move} />
      <MoveCoach key={move.ply} move={move} analysis={analysis} />
      {currentPly === total && <WrapUp analysis={analysis} />}
    </div>
  );
}

// ------------------------------------------------------------------ opening

function OpeningRow({ analysis, move }: { analysis: GameAnalysis; move?: AnalyzedMove }) {
  const opening = move ? move.opening : analysis.opening;
  if (!opening) return null;
  const inBook = move?.isBook;
  return (
    <div className="flex items-center gap-2 rounded-md bg-cg-panel2 px-3 py-2 text-sm">
      <ClassificationIcon classification="book" size={18} />
      <span className="min-w-0 truncate text-cg-muted">
        <span className="font-semibold text-cg-text">{opening.name}</span>
        <span className="ml-1.5 text-cg-faint">{opening.eco}</span>
      </span>
      {move && (
        <span
          className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            inBook ? "bg-[#a88865]/25 text-[#d9b98f]" : "bg-cg-panel3 text-cg-faint"
          }`}
        >
          {inBook ? "In theory" : "Out of book"}
        </span>
      )}
    </div>
  );
}

// --------------------------------------------------------------- per move

function MoveCoach({ move, analysis }: { move: AnalyzedMove; analysis: GameAnalysis }) {
  const [showLine, setShowLine] = useState(false);
  const info = CLASSIFICATION_INFO[move.classification];
  const note = move.coach;
  const player = move.color === "w" ? analysis.white.name : analysis.black.name;
  const color = move.isCheckmate ? CLASSIFICATION_INFO.best.color : info.color;
  const icon: Classification = move.isCheckmate ? "best" : move.classification;

  return (
    <div className="flex gap-3">
      <div className="pt-1">
        <ClassificationIcon classification={icon} size={40} />
      </div>
      <div className="bubble min-w-0 flex-1 rounded-lg bg-white px-3.5 py-3 text-[#312e2b] shadow">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-[17px] font-bold leading-snug" style={{ color: darken(color) }}>
            {note.headline}
          </p>
          <span className="text-xs text-[#8b8987]">
            {move.moveNumber}
            {move.color === "w" ? "." : "..."} · {player}
          </span>
        </div>
        {note.idea && <p className="mt-1.5 text-[14px] leading-relaxed">{note.idea}</p>}
        {note.consequence && <p className="mt-1.5 text-[14px] leading-relaxed">{note.consequence}</p>}

        {note.bestMoveSan && (
          <div className="mt-2.5 rounded-md bg-[#f1f1ee] p-2">
            <div className="flex items-center gap-2 text-[14px]">
              <ClassificationIcon classification="best" size={18} />
              <span>
                <span className="font-bold">{note.bestMoveSan}</span> was best
              </span>
              {note.bestLineSan.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowLine((s) => !s)}
                  className="ml-auto text-xs font-semibold text-[#5d8a32] hover:underline"
                >
                  {showLine ? "Hide line" : "Show line"}
                </button>
              )}
            </div>
            {showLine && <BestLine move={move} />}
          </div>
        )}

        {note.evalChange && (
          <p className="mt-2 border-t border-[#e8e6e1] pt-2 text-xs leading-relaxed text-[#6f6d6a]">
            {note.evalChange}
          </p>
        )}
      </div>
    </div>
  );
}

/** The engine's main line, numbered from the position before the move. */
function BestLine({ move }: { move: AnalyzedMove }) {
  const parts: string[] = [];
  let n = move.moveNumber;
  let side = move.color;
  move.coach.bestLineSan.forEach((san, i) => {
    if (side === "w") parts.push(`${n}. ${san}`);
    else parts.push(i === 0 ? `${n}... ${san}` : san);
    if (side === "b") n++;
    side = side === "w" ? "b" : "w";
  });
  return <p className="mt-1.5 font-mono text-xs leading-relaxed text-[#4b4847]">{parts.join(" ")}</p>;
}

// ----------------------------------------------------------------- wrap-up

function WrapUp({ analysis }: { analysis: GameAnalysis }) {
  const summary = useMemo(() => generateGameSummary(analysis), [analysis]);
  const result = analysis.headers.Result;
  return (
    <div className="rounded-lg border border-cg-line bg-cg-panel2 p-3">
      <p className="text-sm font-bold text-cg-text">
        Game over{result && result !== "*" ? ` · ${result}` : ""}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-cg-muted">{summary}</p>
    </div>
  );
}

// ---------------------------------------------------------------- overview

const SUMMARY_ROWS: Classification[] = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
];

function Overview({ analysis, onSelectPly }: { analysis: GameAnalysis; onSelectPly: (ply: number) => void }) {
  const { white, black } = analysis;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-center">
        <PlayerAccuracy name={white.name} accuracy={white.summary.accuracy} color="w" />
        <span className="pb-3 text-xs font-semibold text-cg-faint">Accuracy</span>
        <PlayerAccuracy name={black.name} accuracy={black.summary.accuracy} color="b" />
      </div>

      <OpeningRow analysis={analysis} />

      <div className="rounded-md bg-cg-panel2 py-1">
        {SUMMARY_ROWS.map((c) => {
          const w = white.summary.counts[c];
          const b = black.summary.counts[c];
          const info = CLASSIFICATION_INFO[c];
          const empty = w + b === 0;
          return (
            <div
              key={c}
              className={`grid grid-cols-[3rem_1fr_auto_1fr_3rem] items-center px-2 py-[2px] text-sm ${
                empty ? "opacity-35" : ""
              }`}
            >
              <span className="text-center font-bold tabular-nums" style={{ color: empty ? undefined : info.color }}>
                {w}
              </span>
              <span className="text-right text-cg-muted">{info.label}</span>
              <span className="mx-3">
                <ClassificationIcon classification={c} size={20} />
              </span>
              <span />
              <span className="text-center font-bold tabular-nums" style={{ color: empty ? undefined : info.color }}>
                {b}
              </span>
            </div>
          );
        })}
      </div>

      <EvalGraph analysis={analysis} currentPly={0} onSelectPly={onSelectPly} />

      {analysis.keyMoments.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-cg-faint">Key moments</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.keyMoments.map((ply) => {
              const m = analysis.moves[ply - 1];
              return (
                <button
                  key={ply}
                  type="button"
                  onClick={() => onSelectPly(ply)}
                  title={m.explanation}
                  className="flex items-center gap-1.5 rounded-md bg-cg-panel3 px-2 py-1 text-sm font-semibold text-cg-text hover:bg-[#4a4844]"
                >
                  <ClassificationIcon classification={m.classification} size={16} />
                  {m.moveNumber}
                  {m.color === "w" ? "." : "..."} {m.san}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button type="button" onClick={() => onSelectPly(1)} className="btn-primary w-full">
        Start Review
      </button>
    </div>
  );
}

function PlayerAccuracy({ name, accuracy, color }: { name: string; accuracy: number; color: "w" | "b" }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-cg-muted">{name}</p>
      <div
        className={`mx-auto mt-1 w-full max-w-[120px] rounded-md py-2 text-2xl font-extrabold tabular-nums ${
          color === "w" ? "bg-white text-[#312e2b]" : "bg-[#1b1a18] text-white ring-1 ring-cg-line"
        }`}
      >
        {accuracy.toFixed(1)}
      </div>
    </div>
  );
}

/** Classification colors are tuned for dark backgrounds; darken a touch for text on white. */
function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.78;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r}, ${g}, ${b})`;
}
