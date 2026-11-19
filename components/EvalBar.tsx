"use client";

import { cpToWhiteWinPercent } from "@/lib/chess/winPercent";

interface EvalBarProps {
  cp: number;
  mate: number | null;
  orientation: "white" | "black";
}

function formatEval(cp: number, mate: number | null): string {
  if (mate != null) return mate === 0 ? "#" : `M${Math.abs(mate)}`;
  if (Math.abs(cp) >= 9000) return "#"; // checkmate on the board (scored as a huge cp value)
  return Math.abs(cp / 100).toFixed(1);
}

/** Vertical eval bar: white fill grows from White's edge of the board. */
export default function EvalBar({ cp, mate, orientation }: EvalBarProps) {
  const rawWhitePct = mate != null ? (mate > 0 ? 100 : 0) : cpToWhiteWinPercent(cp);
  const whitePct = Math.min(98, Math.max(2, rawWhitePct));
  const whiteAhead = mate != null ? mate > 0 : cp >= 0;
  const label = formatEval(cp, mate);
  // The number sits at the end of the bar belonging to the side that's ahead.
  const labelAtBottom = (whiteAhead && orientation === "white") || (!whiteAhead && orientation === "black");

  return (
    <div
      className="relative flex w-9 shrink-0 flex-col overflow-hidden rounded bg-[#403d39]"
      title={`${whiteAhead ? "White" : "Black"} is ahead (${label})`}
    >
      <div
        className="w-full transition-[height] duration-300 ease-out"
        style={{ height: `${orientation === "white" ? 100 - whitePct : whitePct}%` }}
      />
      <div
        className="absolute inset-x-0 bg-white transition-all duration-300 ease-out"
        style={
          orientation === "white"
            ? { bottom: 0, height: `${whitePct}%` }
            : { top: 0, height: `${whitePct}%` }
        }
      />
      <span
        className={`pointer-events-none absolute inset-x-0 z-10 text-center text-[11px] font-bold ${
          whiteAhead ? "text-[#403d39]" : "text-white"
        } ${labelAtBottom ? "bottom-1.5" : "top-1.5"}`}
      >
        {label}
      </span>
    </div>
  );
}
