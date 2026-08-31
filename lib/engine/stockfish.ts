import { Chess } from "chess.js";
import type { EngineOptions, PositionEval } from "@/lib/types";
import { mateToCp } from "@/lib/chess/winPercent";

// The npm "stockfish" package (chess.com's own WASM build of Stockfish 18) is
// CommonJS and Node-oriented — we run the engine in the Next.js server process
// rather than a browser Web Worker, avoiding COOP/COEP requirements for the
// multi-threaded build while still analyzing 100% locally, no third-party API.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const initEngine = require("stockfish") as (variant?: string) => Promise<StockfishModule>;

// The WASM loader above nulls out the *global* `fetch` the moment it detects
// it's running under Node (it wants to force its own fs/XHR-based loading
// path instead). That's a process-wide side effect — it breaks every other
// fetch() call in this server (e.g. the chess.com/Lichess importers) for the
// rest of the process's life once any analysis has run. Capture the real
// fetch now, before that ever happens, so it can be restored.
const nativeFetch: typeof globalThis.fetch | undefined =
  typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : undefined;

function restoreNativeFetch(): void {
  if (nativeFetch && typeof globalThis.fetch !== "function") {
    globalThis.fetch = nativeFetch;
  }
}

interface StockfishModule {
  sendCommand(cmd: string): void;
  listener?: (line: string) => void;
}

interface RawInfo {
  depth?: number;
  multipv?: number;
  cp?: number;
  mate?: number;
  pv?: string[];
}

function parseInfoLine(line: string): RawInfo | null {
  if (!line.startsWith("info")) return null;
  const tokens = line.split(/\s+/);
  const info: RawInfo = {};
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "depth") info.depth = Number(tokens[++i]);
    else if (t === "multipv") info.multipv = Number(tokens[++i]);
    else if (t === "score") {
      const kind = tokens[++i];
      const val = Number(tokens[++i]);
      if (kind === "cp") info.cp = val;
      else if (kind === "mate") info.mate = val;
    } else if (t === "pv") {
      info.pv = tokens.slice(i + 1);
      break;
    }
  }
  return info;
}

function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

/** Checkmate/stalemate positions have no legal moves — skip the engine and return the known result. */
function terminalPositionEval(fen: string): PositionEval | null {
  const chess = new Chess(fen);
  if (!chess.isGameOver()) return null;
  const stm = sideToMove(fen);
  const cp = chess.isCheckmate() ? mateToCp(stm === "w" ? -1 : 1) : 0;
  return {
    fen,
    cp,
    mate: null,
    bestMoveUci: null,
    bestMoveSan: null,
    bestLineSan: [],
    secondBestCp: null,
    depth: 0,
  };
}

/** Converts a raw UCI line (side-to-move POV, possibly a mate score) into White-POV cp. */
function toWhitePovCp(raw: { cp?: number; mate?: number }, stm: "w" | "b"): { cp: number; mate: number | null } {
  const sign = stm === "w" ? 1 : -1;
  if (raw.mate != null) {
    const mateWhitePov = sign * raw.mate;
    return { cp: mateToCp(mateWhitePov), mate: mateWhitePov };
  }
  const cpWhitePov = sign * (raw.cp ?? 0);
  return { cp: cpWhitePov, mate: null };
}

function uciToSan(fen: string, uciMoves: string[], maxMoves: number): string[] {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of uciMoves.slice(0, maxMoves)) {
    if (uci.length < 4) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4) : undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move = chess.move({ from, to, promotion } as any);
      if (!move) break;
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return sans;
}

class StockfishEngine {
  private modulePromise: Promise<StockfishModule>;
  private queue: Promise<unknown> = Promise.resolve();
  private initialized = false;

  constructor() {
    this.modulePromise = initEngine("lite-single");
    // The nulling happens synchronously inside the call above; restore
    // immediately rather than waiting on the (async, WASM-compile) promise.
    restoreNativeFetch();
    this.modulePromise.then(restoreNativeFetch);
  }

  private run<T>(task: (engine: StockfishModule) => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const engine = await this.modulePromise;
      return task(engine);
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    await this.run(async (engine) => {
      await sendAndWaitFor(engine, "uci", "uciok");
      engine.sendCommand("setoption name MultiPV value 2");
      engine.sendCommand("setoption name Threads value 1");
      await sendAndWaitFor(engine, "isready", "readyok");
    });
    this.initialized = true;
  }

  async evaluate(fen: string, opts: EngineOptions): Promise<PositionEval> {
    const terminal = terminalPositionEval(fen);
    if (terminal) return terminal;
    await this.ensureInit();
    return this.run((engine) => this.evaluateOnce(engine, fen, opts));
  }

  private evaluateOnce(engine: StockfishModule, fen: string, opts: EngineOptions): Promise<PositionEval> {
    const stm = sideToMove(fen);
    return new Promise((resolve) => {
      const lines: Record<number, RawInfo> = {};
      let lastDepth = 0;

      engine.listener = (line: string) => {
        const info = parseInfoLine(line);
        if (info && info.pv && (info.cp != null || info.mate != null)) {
          const mpv = info.multipv ?? 1;
          lines[mpv] = info;
          if (info.depth) lastDepth = Math.max(lastDepth, info.depth);
          return;
        }
        if (line.startsWith("bestmove")) {
          const parts = line.split(/\s+/);
          const bestUci = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
          resolve(buildResult(fen, stm, lines, bestUci, lastDepth));
        }
      };

      engine.sendCommand(`position fen ${fen}`);
      engine.sendCommand(`go depth ${opts.depth} movetime ${opts.movetimeMs}`);
    });
  }

  quit(): void {
    this.run(async (engine) => {
      engine.sendCommand("quit");
    });
  }
}

function buildResult(
  fen: string,
  stm: "w" | "b",
  lines: Record<number, RawInfo>,
  bestUciFromEngine: string | null,
  depth: number
): PositionEval {
  const line1 = lines[1];
  const line2 = lines[2];
  const bestUci = bestUciFromEngine ?? (line1?.pv ? line1.pv[0] : null);

  if (!line1 || !bestUci) {
    return {
      fen,
      cp: 0,
      mate: null,
      bestMoveUci: bestUci,
      bestMoveSan: bestUci ? uciToSan(fen, [bestUci], 1)[0] ?? null : null,
      bestLineSan: [],
      secondBestCp: null,
      depth,
    };
  }

  const { cp, mate } = toWhitePovCp(line1, stm);
  const bestLineSan = uciToSan(fen, line1.pv ?? [bestUci], 6);
  let secondBestCp: number | null = null;
  if (line2 && (line2.cp != null || line2.mate != null)) {
    secondBestCp = toWhitePovCp(line2, stm).cp;
  }

  return {
    fen,
    cp,
    mate,
    bestMoveUci: bestUci,
    bestMoveSan: bestLineSan[0] ?? null,
    bestLineSan,
    secondBestCp,
    depth,
  };
}

function sendAndWaitFor(engine: StockfishModule, cmd: string, waitFor: string): Promise<void> {
  return new Promise((resolve) => {
    engine.listener = (line: string) => {
      if (line.startsWith(waitFor)) resolve();
    };
    engine.sendCommand(cmd);
  });
}

let sharedEngine: StockfishEngine | null = null;

/** One Stockfish instance per server process, calls serialized through an internal queue. */
export function getSharedEngine(): StockfishEngine {
  if (!sharedEngine) sharedEngine = new StockfishEngine();
  return sharedEngine;
}

export function speedToEngineOptions(speed: "quick" | "deep"): EngineOptions {
  if (speed === "deep") {
    return { speed, depth: 20, movetimeMs: 3000 };
  }
  return { speed, depth: 14, movetimeMs: 700 };
}
