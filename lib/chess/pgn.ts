import { Chess } from "chess.js";
import type { MoveRecord } from "@/lib/types";

export interface ParsedGame {
  headers: Record<string, string>;
  moves: MoveRecord[];
  fens: string[]; // fens[0] = start position, fens[i] = position after moves[i-1]
}

/** Parses raw PGN text into headers + a flat move list with before/after FENs. */
export function parsePgn(pgn: string): ParsedGame {
  const chess = new Chess();
  chess.loadPgn(pgn, { strict: false });

  const headers = chess.header();
  const cleanHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v != null) cleanHeaders[k] = v;
  }

  const verboseMoves = chess.history({ verbose: true });
  const fens: string[] = [verboseMoves.length > 0 ? verboseMoves[0].before : chess.fen()];
  const moves: MoveRecord[] = verboseMoves.map((m, i) => {
    fens.push(m.after);
    return {
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: m.color,
      san: m.san,
      uci: m.from + m.to + (m.promotion ?? ""),
      fenBefore: m.before,
      fenAfter: m.after,
      isCapture: m.isCapture(),
      isCheck: m.san.includes("+") || m.san.includes("#"),
      isCheckmate: m.san.includes("#"),
      capturedPiece: m.captured ?? null,
    };
  });

  return { headers: cleanHeaders, moves, fens };
}

/** Basic validation used by the paste-PGN input path before kicking off analysis. */
export function validatePgn(pgn: string): { ok: true } | { ok: false; error: string } {
  if (!pgn.trim()) return { ok: false, error: "Paste a PGN to review." };
  try {
    const chess = new Chess();
    chess.loadPgn(pgn, { strict: false });
    if (chess.history().length === 0) {
      return { ok: false, error: "No moves found in that PGN." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not parse PGN." };
  }
}
