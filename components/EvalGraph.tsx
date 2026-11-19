"use client";

import { useRef } from "react";
import type { GameAnalysis } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/types";
import { cpToWhiteWinPercent } from "@/lib/chess/winPercent";

interface EvalGraphProps {
  analysis: GameAnalysis;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

const HEIGHT = 60;

export default function EvalGraph({ analysis, currentPly, onSelectPly }: EvalGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const series = analysis.evalSeries;
  const n = series.length;
  if (n === 0) return null;

  const points = series.map((p, i) => {
    const whitePct = p.mate != null ? (p.mate > 0 ? 100 : 0) : cpToWhiteWinPercent(p.cp);
    const x = n === 1 ? 0 : (i / (n - 1)) * 100;
    const y = HEIGHT - (whitePct / 100) * HEIGHT;
    return { x, y, ply: p.ply };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L 100 ${HEIGHT} L 0 ${HEIGHT} Z`;

  const currentPoint = points[Math.min(currentPly, points.length - 1)];

  function handlePointerEvent(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const ply = Math.round(fraction * (n - 1));
    onSelectPly(ply);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full cursor-pointer select-none overflow-hidden rounded-md bg-[#403d39]"
      title="Evaluation over the game. Click to jump to a move."
      onClick={(e) => handlePointerEvent(e.clientX)}
      onMouseMove={(e) => {
        if (e.buttons === 1) handlePointerEvent(e.clientX);
      }}
    >
      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-16 w-full"
      >
        <path d={areaPath} fill="#ffffff" />
        <line x1="0" y1={HEIGHT / 2} x2="100" y2={HEIGHT / 2} stroke="#8b8987" strokeWidth="0.4" strokeDasharray="1 1" />
        {analysis.keyMoments.map((ply) => {
          const pt = points[ply];
          if (!pt) return null;
          return (
            <circle
              key={ply}
              cx={pt.x}
              cy={pt.y}
              r="1.4"
              fill={CLASSIFICATION_INFO[analysis.moves[ply - 1]?.classification ?? "blunder"].color}
              stroke="#ffffff"
              strokeWidth="0.35"
            />
          );
        })}
        {currentPoint && (
          <line
            x1={currentPoint.x}
            y1="0"
            x2={currentPoint.x}
            y2={HEIGHT}
            stroke="#81b64c"
            strokeWidth="0.9"
          />
        )}
      </svg>
    </div>
  );
}
