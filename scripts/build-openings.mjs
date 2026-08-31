// One-off build script: converts the Lichess chess-openings TSV dataset
// (github.com/lichess-org/chess-openings, public domain ECO/name/PGN data)
// into a compact JSON lookup table bundled with the app.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const files = ["a", "b", "c", "d", "e"].map((l) =>
  path.join(__dirname, "opening-data", `${l}.tsv`)
);

/** Strips move numbers/dots from a PGN movetext string, returns array of SAN moves. */
function movesFromPgn(pgn) {
  return pgn
    .replace(/\{[^}]*\}/g, "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !/^\d+\.+$/.test(t) && t !== "*");
}

const entries = [];
for (const file of files) {
  const text = readFileSync(file, "utf-8");
  const lines = text.split("\n").slice(1); // drop header
  for (const line of lines) {
    if (!line.trim()) continue;
    const [eco, name, pgn] = line.split("\t");
    if (!eco || !name || !pgn) continue;
    const moves = movesFromPgn(pgn.trim());
    if (moves.length === 0) continue;
    entries.push({ eco: eco.trim(), name: name.trim(), moves });
  }
}

// Key by the exact move sequence so we can do longest-prefix lookup at runtime.
const table = {};
for (const e of entries) {
  table[e.moves.join(" ")] = { eco: e.eco, name: e.name };
}

const outDir = path.join(__dirname, "..", "lib", "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "openings.json"),
  JSON.stringify(table),
  "utf-8"
);

console.log(`Wrote ${Object.keys(table).length} opening lines to lib/data/openings.json`);
