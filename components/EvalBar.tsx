"use client";

import { cpToWhiteWinPercent } from "@/lib/chess/winPercent";

interface EvalBarProps {
  cp: number;
  mate: number | null;
  orientation: "white" | "black";
}

function formatEval(cp: number, mate: number | null): string {
  if (mate != null) return `M${Math.abs(mate)}`;
  const pawns = cp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(1)}`;
}

/** A chess.com-style vertical eval bar: white fill grows from White's edge of the board. */
export default function EvalBar({ cp, mate, orientation }: EvalBarProps) {
  const rawWhitePct = mate != null ? (mate > 0 ? 100 : 0) : cpToWhiteWinPercent(cp);
  const whitePct = Math.min(99, Math.max(1, rawWhitePct));
  const label = formatEval(cp, mate);
  const whiteWinning = cp >= 0;
  // The label sits in whichever half is currently larger, in that half's contrasting text color.
  const labelInWhiteHalf = whitePct >= 50;

  return (
    <div className="relative flex h-full w-8 shrink-0 flex-col overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 sm:w-9">
      <div
        className="w-full bg-neutral-900 transition-[height] duration-300 ease-out"
        style={{ height: `${orientation === "white" ? 100 - whitePct : whitePct}%` }}
      />
      <div
        className="w-full bg-neutral-100 transition-[height] duration-300 ease-out"
        style={{ height: `${orientation === "white" ? whitePct : 100 - whitePct}%` }}
      />
      <span
        className={`pointer-events-none absolute inset-x-0 text-center text-[10px] font-semibold ${
          labelInWhiteHalf ? "text-neutral-900" : "text-neutral-100"
        } ${
          (labelInWhiteHalf && orientation === "white") || (!labelInWhiteHalf && orientation === "black")
            ? "bottom-1"
            : "top-1"
        }`}
        title={`${whiteWinning ? "White" : "Black"} is better (${label})`}
      >
        {label}
      </span>
    </div>
  );
}
