# Game Review

A local, Stockfish-powered clone of chess.com's post-game "Game Review": paste a
PGN or import from chess.com/Lichess and get move classifications, an accuracy
score, an evaluation graph, and a plain-English explanation for every move.
All analysis runs locally via a WASM build of Stockfish — no third-party
analysis API.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click "Use a sample game"
for a quick end-to-end try, or paste a PGN / import by chess.com or Lichess
username or game URL.

## How it works

- **chess.js** parses PGN and drives move/position logic.
- **Stockfish 18 (lite, single-threaded WASM)** runs server-side, inside the
  Next.js Node process (`lib/engine/stockfish.ts`), analyzed via the `stockfish`
  npm package rather than a browser Web Worker — this avoids the COOP/COEP
  headers the multi-threaded build needs, while keeping analysis 100% local.
  `POST /api/analyze` streams NDJSON progress events as each position is
  evaluated, then a final `done` event with the full `GameAnalysis`.
- **Opening detection** uses the [Lichess chess-openings](https://github.com/lichess-org/chess-openings)
  dataset (public domain), bundled as `lib/data/openings.json`
  (`scripts/build-openings.mjs` regenerates it from `scripts/opening-data/*.tsv`).
- **Move classification** (`lib/chess/classify.ts`) and **accuracy**
  (`lib/chess/winPercent.ts`) use the win%-based approach Lichess documents
  publicly for its own move annotations. Chess.com has never published its
  exact formula, so these thresholds are a documented approximation —
  directionally consistent, not a byte-for-byte match. The Brilliant detector
  uses a simplified static-exchange evaluation (`lib/chess/tactics.ts`) to
  spot real sacrifices rather than ordinary trades.
- **Coach notes** (`lib/chess/explain.ts`) break every move down into a
  headline ("Nxe5 is a blunder"), the idea behind the move (development,
  center control, castling, threats, trades), what it allows (hanging or
  newly exposed pieces, forks, forced mates, leaving opening theory), the
  engine's better move with its full line, and the evaluation change in plain
  words. Generated from chess.js board analysis plus the engine's lines: no
  LLM call, fully deterministic and local.
- **Openings are tracked move by move** (`openingByPly` in
  `lib/chess/openings.ts`), so the review always shows which named line the
  game is in, whether each move is still "in theory", and the exact move that
  left the book.
- **Imports**: chess.com via the public `api.chess.com/pub/player/...`
  endpoint (by username) and a best-effort decode of chess.com's internal TCN
  move format for direct game URLs (via the `chess-tcn` package). Lichess via
  its official `/api/games/user/{username}` and `/game/export/{id}` endpoints.

## Scripts

- `npm run dev` / `npm run build` / `npm start` — standard Next.js.
- `node scripts/build-openings.mjs` — regenerate the opening book.
- `npx tsx scripts/test-analyze.ts` — run the analysis pipeline against a
  sample game from the command line (useful for debugging without the UI).

## Known limitations

- Chess.com single-game-by-URL import uses an undocumented internal endpoint
  and may break if chess.com changes it; username-based import uses their
  stable public API and is the more robust path.
- Lichess's `/api/games/user` endpoint is rate-limited fairly aggressively;
  repeated imports in quick succession may need a short cooldown.
- The Brilliant/Great heuristics are approximations of chess.com's unpublished
  algorithm — expect close, not identical, results to chess.com's own review.
