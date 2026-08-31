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
