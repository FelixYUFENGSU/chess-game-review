import { NextRequest } from "next/server";
import { analyzeGame } from "@/lib/engine/analyzeGame";
import { validatePgn } from "@/lib/chess/pgn";
import type { AnalysisSpeed, AnalyzeStreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel's ceiling for Hobby with Fluid compute (the default); analysis stays inside
// it via the per-game time budget in lib/engine/stockfish.ts.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const pgn: unknown = body?.pgn;
  const speed: AnalysisSpeed = body?.speed === "deep" ? "deep" : "quick";

  if (typeof pgn !== "string") {
    return new Response(JSON.stringify({ type: "error", message: "Missing PGN." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const validation = validatePgn(pgn);
  if (!validation.ok) {
    return new Response(JSON.stringify({ type: "error", message: validation.error }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalyzeStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        for await (const event of analyzeGame(pgn, speed)) {
          send(event);
        }
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Analysis failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
