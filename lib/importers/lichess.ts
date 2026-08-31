const USER_AGENT = "chess-game-review-app/1.0 (local tool; contact: n/a)";

export interface LichessGameSummary {
  id: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  result: string;
  timeClass: string;
  createdAt: number;
}

function headerValue(pgn: string, tag: string): string | undefined {
  const match = pgn.match(new RegExp(`\\[${tag} "([^"]*)"\\]`));
  return match?.[1];
}

function splitConcatenatedPgn(text: string): string[] {
  return text
    .split(/(?=\[Event )/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function summaryFromPgn(pgn: string): LichessGameSummary {
  const site = headerValue(pgn, "Site") ?? "";
  const id = site.split("/").pop() ?? site;
  return {
    id,
    pgn,
    white: headerValue(pgn, "White") ?? "White",
    black: headerValue(pgn, "Black") ?? "Black",
    whiteRating: Number(headerValue(pgn, "WhiteElo") ?? 0),
    blackRating: Number(headerValue(pgn, "BlackElo") ?? 0),
    result: headerValue(pgn, "Result") ?? "*",
    timeClass: headerValue(pgn, "TimeControl") ?? "",
    createdAt: Date.parse(headerValue(pgn, "UTCDate") ?? "") || 0,
  };
}

async function lichessFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/x-chess-pgn" },
  });
}

/** Pulls the most recent games for a Lichess username, newest first. */
export async function fetchRecentLichessGames(
  username: string,
  limit = 15
): Promise<LichessGameSummary[]> {
  const clean = username.trim();
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    clean
  )}?max=${limit}&pgnInJson=false&clocks=false&evals=false&opening=true`;
  const res = await lichessFetch(url);
  if (res.status === 404) {
    throw new Error(`No Lichess account found for "${username}".`);
  }
  if (!res.ok) {
    throw new Error(`Lichess API error (${res.status}).`);
  }
  const text = await res.text();
  if (!text.trim()) return [];
  return splitConcatenatedPgn(text).map(summaryFromPgn);
}

function extractGameId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9]{8}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/lichess\.org\/([a-zA-Z0-9]{8})/);
  return match ? match[1] : null;
}

/** Fetches a single Lichess game's PGN by game ID or lichess.org game URL. */
export async function fetchLichessGameById(input: string): Promise<string> {
  const id = extractGameId(input);
  if (!id) {
    throw new Error("Could not find a game ID in that Lichess URL.");
  }
  const res = await lichessFetch(`https://lichess.org/game/export/${id}?pgnInJson=false`);
  if (res.status === 404) {
    throw new Error("That Lichess game could not be found.");
  }
  if (!res.ok) {
    throw new Error(`Lichess API error (${res.status}).`);
  }
  const pgn = await res.text();
  if (!pgn.trim()) {
    throw new Error("Lichess returned an empty game.");
  }
  return pgn;
}
