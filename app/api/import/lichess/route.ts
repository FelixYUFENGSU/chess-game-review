import { NextRequest, NextResponse } from "next/server";
import { fetchRecentLichessGames, fetchLichessGameById } from "@/lib/importers/lichess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const id = searchParams.get("id");

  try {
    if (id) {
      const pgn = await fetchLichessGameById(id);
      return NextResponse.json({ pgn });
    }
    if (username) {
      const games = await fetchRecentLichessGames(username);
      return NextResponse.json({ games });
    }
    return NextResponse.json({ error: "Provide a username or id." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lichess import failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
