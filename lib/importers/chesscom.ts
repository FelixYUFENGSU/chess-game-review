import { tcnToPgn } from "chess-tcn";

const USER_AGENT = "chess-game-review-app/1.0 (local tool; contact: n/a)";

export interface ChesscomGameSummary {
  id: string;
  url: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  result: string;
  timeClass: string;
  endTime: number;
  eco: string | null;
}

interface ChesscomApiGame {
  url: string;
  pgn?: string;
  uuid: string;
  end_time?: number;
  time_class?: string;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
  eco?: string;
}

function resultFromGame(g: ChesscomApiGame): string {
  if (g.white?.result === "win") return "1-0";
  if (g.black?.result === "win") return "0-1";
  return "1/2-1/2";
}

async function chesscomFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  return res;
}

/** Pulls the most recent games for a chess.com username via the public pub-api, newest first. */
export async function fetchRecentChesscomGames(
  username: string,
  limit = 15
): Promise<ChesscomGameSummary[]> {
  const clean = username.trim().toLowerCase();
  const archivesRes = await chesscomFetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(clean)}/games/archives`
  );
  if (archivesRes.status === 404) {
    throw new Error(`No chess.com account found for "${username}".`);
  }
  if (!archivesRes.ok) {
    throw new Error(`Chess.com API error (${archivesRes.status}).`);
  }
  const archivesData = (await archivesRes.json()) as { archives?: string[] };
  const archives = archivesData.archives ?? [];
  if (archives.length === 0) return [];

  const games: ChesscomGameSummary[] = [];
  for (let i = archives.length - 1; i >= 0 && games.length < limit; i--) {
    const res = await chesscomFetch(archives[i]);
    if (!res.ok) continue;
    const data = (await res.json()) as { games?: ChesscomApiGame[] };
    const monthGames = (data.games ?? []).slice().reverse();
    for (const g of monthGames) {
      if (!g.pgn) continue;
      games.push({
        id: g.uuid,
        url: g.url,
        pgn: g.pgn,
        white: g.white?.username ?? "White",
        black: g.black?.username ?? "Black",
        whiteRating: g.white?.rating ?? 0,
        blackRating: g.black?.rating ?? 0,
        result: resultFromGame(g),
        timeClass: g.time_class ?? "",
        endTime: g.end_time ?? 0,
        eco: g.eco ? decodeURIComponent(g.eco.split("/").pop() ?? "").replace(/-/g, " ") : null,
      });
      if (games.length >= limit) break;
    }
  }
  return games;
}

function extractGameId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/game\/(?:live|daily)\/(\d+)/) ?? trimmed.match(/(\d{5,})/);
  return match ? match[1] : null;
}

/** Best-effort PGN extraction from a chess.com game URL, via chess.com's internal (undocumented)
 *  callback endpoint. Live/daily games only — this endpoint has no public API contract. */
export async function fetchChesscomGameByUrl(input: string): Promise<string> {
  const id = extractGameId(input);
  if (!id) {
    throw new Error("Could not find a game ID in that chess.com URL.");
  }

  const res = await chesscomFetch(`https://www.chess.com/callback/live/game/${id}`);
  if (!res.ok) {
    throw new Error(
      "Could not load that chess.com game. It may be private, not a live/rapid/blitz game, or the URL format wasn't recognized."
    );
  }
  const data = (await res.json()) as {
    game?: { moveList?: string; pgnHeaders?: Record<string, string | number> };
  };
  const moveList = data.game?.moveList;
  const pgnHeaders = data.game?.pgnHeaders ?? {};
  if (!moveList) {
    throw new Error("This game has no move list available (it may not have started or finished).");
  }

  const decoded = tcnToPgn(moveList);
  const movetext = decoded.split(/\n\n/).slice(1).join("\n\n").trim();

  const headerLines = Object.entries(pgnHeaders)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `[${k} "${v}"]`);

  return `${headerLines.join("\n")}\n\n${movetext}\n`;
}
