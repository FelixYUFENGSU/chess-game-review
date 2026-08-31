import { NextRequest, NextResponse } from "next/server";
import { fetchRecentChesscomGames, fetchChesscomGameByUrl } from "@/lib/importers/chesscom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const url = searchParams.get("url");

  try {
    if (url) {
      const pgn = await fetchChesscomGameByUrl(url);
      return NextResponse.json({ pgn });
    }
    if (username) {
      const games = await fetchRecentChesscomGames(username);
      return NextResponse.json({ games });
    }
    return NextResponse.json({ error: "Provide a username or url." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chess.com import failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
