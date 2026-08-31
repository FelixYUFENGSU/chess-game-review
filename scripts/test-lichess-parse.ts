import { readFileSync } from "node:fs";

// Re-implements the private parsing helpers from lib/importers/lichess.ts to
// verify them against real Lichess PGN text without hitting the (rate-limited
// during testing) network endpoint again.
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

function summaryFromPgn(pgn: string) {
  const site = headerValue(pgn, "Site") ?? "";
  const id = site.split("/").pop() ?? site;
  return {
    id,
    white: headerValue(pgn, "White") ?? "White",
    black: headerValue(pgn, "Black") ?? "Black",
    result: headerValue(pgn, "Result") ?? "*",
  };
}

const text = readFileSync("/tmp/concat.pgn", "utf-8");
const games = splitConcatenatedPgn(text).map(summaryFromPgn);
console.log(`Parsed ${games.length} games from concatenated PGN text:`);
console.log(games);
