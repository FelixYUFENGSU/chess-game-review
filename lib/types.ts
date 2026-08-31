import type { PieceSymbol } from "chess.js";

export type Classification =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "miss";

export const CLASSIFICATIONS: Classification[] = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "blunder",
  "miss",
];

export interface ClassificationInfo {
  label: string;
  symbol: string;
  color: string; // hex, matches chess.com-style move badge colors
}

export const CLASSIFICATION_INFO: Record<Classification, ClassificationInfo> = {
  brilliant: { label: "Brilliant", symbol: "!!", color: "#1baaa6" },
  great: { label: "Great", symbol: "!", color: "#5c8bb0" },
  best: { label: "Best", symbol: "★", color: "#8bc34a" },
  excellent: { label: "Excellent", symbol: "", color: "#8bc34a" },
  good: { label: "Good", symbol: "", color: "#95b776" },
  book: { label: "Book", symbol: "", color: "#a88865" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", color: "#e6a13c" },
  mistake: { label: "Mistake", symbol: "?", color: "#e58f2a" },
  blunder: { label: "Blunder", symbol: "??", color: "#ca3431" },
  miss: { label: "Miss", symbol: "", color: "#e6784a" },
};

export type AnalysisSpeed = "quick" | "deep";

export interface EngineOptions {
  speed: AnalysisSpeed;
  depth: number;
  movetimeMs: number;
}

/** Engine evaluation of a single position, always normalized to White's point of view. */
export interface PositionEval {
  fen: string;
  /** Centipawns from White's perspective. Mate scores are collapsed into a large-magnitude value for graphing/thresholds. */
  cp: number;
  /** Signed mate-in-N from White's perspective (positive = White mates), null if no forced mate found. */
  mate: number | null;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  bestLineSan: string[];
  /** cp of the second-best line (White POV), when MultiPV=2 search found one. */
  secondBestCp: number | null;
  depth: number;
}

export interface MoveRecord {
  ply: number; // 1-based half-move index (1 = White's first move)
  moveNumber: number; // full move number, shared by the White/Black pair
  color: "w" | "b";
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  capturedPiece: PieceSymbol | null;
}

export interface AnalyzedMove extends MoveRecord {
  evalBefore: PositionEval;
  evalAfter: PositionEval;
  classification: Classification;
  cpLossMoverPov: number;
  winPercentBeforeMoverPov: number;
  winPercentAfterMoverPov: number;
  winPercentLossMoverPov: number;
  isBook: boolean;
  isCriticalMoment: boolean;
  explanation: string;
}

export interface PlayerSummary {
  accuracy: number;
  counts: Record<Classification, number>;
}

export interface EvalSeriesPoint {
  ply: number;
  cp: number;
  mate: number | null;
}

export interface OpeningInfo {
  eco: string;
  name: string;
}

export interface GameAnalysis {
  headers: Record<string, string>;
  white: { name: string; summary: PlayerSummary };
  black: { name: string; summary: PlayerSummary };
  moves: AnalyzedMove[];
  evalSeries: EvalSeriesPoint[];
  keyMoments: number[]; // plies flagged as critical turning points
  opening: OpeningInfo | null;
  engineOptions: EngineOptions;
}

export interface AnalyzeProgressEvent {
  type: "progress";
  ply: number;
  total: number;
}

export interface AnalyzeDoneEvent {
  type: "done";
  analysis: GameAnalysis;
}

export interface AnalyzeErrorEvent {
  type: "error";
  message: string;
}

export type AnalyzeStreamEvent =
  | AnalyzeProgressEvent
  | AnalyzeDoneEvent
  | AnalyzeErrorEvent;
