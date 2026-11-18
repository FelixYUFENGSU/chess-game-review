import openingsTable from "@/lib/data/openings.json";
import type { OpeningInfo } from "@/lib/types";

const table = openingsTable as Record<string, { eco: string; name: string }>;

/**
 * Finds the most specific (longest) known opening line that is an exact prefix
 * of the given SAN move list, searching from the full game length down to 1 ply.
 * Returns the opening plus how many plies of the game it covers ("book" moves).
 */
export function findOpening(
  sanMoves: string[]
): { opening: OpeningInfo; bookPlies: number } | null {
  for (let len = sanMoves.length; len >= 1; len--) {
    const key = sanMoves.slice(0, len).join(" ");
    const hit = table[key];
    if (hit) {
      return { opening: { eco: hit.eco, name: hit.name }, bookPlies: len };
    }
  }
  return null;
}

/**
 * The opening as of each ply: entry i is the most specific known line covered
 * by the first i+1 moves (it keeps the last name found once the game leaves
 * theory). Lets the review show the opening name at every move.
 */
export function openingByPly(sanMoves: string[]): (OpeningInfo | null)[] {
  const out: (OpeningInfo | null)[] = [];
  let current: OpeningInfo | null = null;
  for (let len = 1; len <= sanMoves.length; len++) {
    const hit = table[sanMoves.slice(0, len).join(" ")];
    if (hit) current = { eco: hit.eco, name: hit.name };
    out.push(current);
  }
  return out;
}
