"use client";

import { useState } from "react";
import { SAMPLE_PGN } from "@/lib/sampleGame";
import type { AnalysisSpeed } from "@/lib/types";

interface ImportPanelProps {
  onSubmit: (pgn: string, speed: AnalysisSpeed) => void;
  disabled?: boolean;
}

type Tab = "paste" | "chesscom" | "lichess";

export default function ImportPanel({ onSubmit, disabled }: ImportPanelProps) {
  const [tab, setTab] = useState<Tab>("paste");
  const [pgn, setPgn] = useState("");
  const [speed, setSpeed] = useState<AnalysisSpeed>("quick");
  const [error, setError] = useState<string | null>(null);

  function handlePgnResolved(resolvedPgn: string) {
    setError(null);
    onSubmit(resolvedPgn, speed);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex justify-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 p-1">
        <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
          Paste PGN
        </TabButton>
        <TabButton active={tab === "chesscom"} onClick={() => setTab("chesscom")}>
          Chess.com
        </TabButton>
        <TabButton active={tab === "lichess"} onClick={() => setTab("lichess")}>
          Lichess
        </TabButton>
      </div>

      <div className="mb-4 flex items-center justify-center gap-2 text-sm">
        <span className="text-neutral-400">Analysis speed:</span>
        <SpeedButton active={speed === "quick"} onClick={() => setSpeed("quick")}>
          Quick
        </SpeedButton>
        <SpeedButton active={speed === "deep"} onClick={() => setSpeed("deep")}>
          Deep
        </SpeedButton>
      </div>

      {tab === "paste" && (
        <div className="space-y-3">
          <textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder="Paste PGN here..."
            rows={10}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 font-mono text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPgn(SAMPLE_PGN)}
              className="text-xs text-neutral-400 underline hover:text-neutral-200"
            >
              Use a sample game
            </button>
            <button
              type="button"
              disabled={disabled || !pgn.trim()}
              onClick={() => handlePgnResolved(pgn)}
              className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review Game
            </button>
          </div>
        </div>
      )}

      {tab === "chesscom" && (
        <RemoteImport
          key="chesscom"
          disabled={disabled}
          urlPlaceholder="https://www.chess.com/game/live/123456789"
          urlHint="Live/rapid/blitz game URLs (best-effort; daily games and private games may not work)."
          listGames={async (username) => {
            const res = await fetch(`/api/import/chesscom?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Import failed.");
            return (data.games as ChesscomGame[]).map((g) => ({
              id: g.id,
              pgn: g.pgn,
              title: `${g.white} (${g.whiteRating}) vs ${g.black} (${g.blackRating})`,
              subtitle: `${g.result} · ${g.timeClass} · ${new Date(g.endTime * 1000).toLocaleDateString()}`,
            }));
          }}
          resolveUrl={async (url) => {
            const res = await fetch(`/api/import/chesscom?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Import failed.");
            return data.pgn as string;
          }}
          onPgnResolved={handlePgnResolved}
        />
      )}

      {tab === "lichess" && (
        <RemoteImport
          key="lichess"
          disabled={disabled}
          urlPlaceholder="https://lichess.org/abcdEFgh or a game ID"
          urlHint="Any finished Lichess game, by URL or 8-character game ID."
          listGames={async (username) => {
            const res = await fetch(`/api/import/lichess?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Import failed.");
            return (data.games as LichessGame[]).map((g) => ({
              id: g.id,
              pgn: g.pgn,
              title: `${g.white} (${g.whiteRating || "?"}) vs ${g.black} (${g.blackRating || "?"})`,
              subtitle: `${g.result} · ${g.timeClass}`,
            }));
          }}
          resolveUrl={async (idOrUrl) => {
            const res = await fetch(`/api/import/lichess?id=${encodeURIComponent(idOrUrl)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Import failed.");
            return data.pgn as string;
          }}
          onPgnResolved={handlePgnResolved}
        />
      )}

      {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}

interface ChesscomGame {
  id: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  result: string;
  timeClass: string;
  endTime: number;
}

interface LichessGame {
  id: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  result: string;
  timeClass: string;
}

interface RemoteGameEntry {
  id: string;
  pgn: string;
  title: string;
  subtitle: string;
}

function RemoteImport({
  disabled,
  urlPlaceholder,
  urlHint,
  listGames,
  resolveUrl,
  onPgnResolved,
}: {
  disabled?: boolean;
  urlPlaceholder: string;
  urlHint: string;
  listGames: (username: string) => Promise<RemoteGameEntry[]>;
  resolveUrl: (input: string) => Promise<string>;
  onPgnResolved: (pgn: string) => void;
}) {
  const [mode, setMode] = useState<"username" | "url">("username");
  const [username, setUsername] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [games, setGames] = useState<RemoteGameEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleListGames() {
    if (!username.trim()) return;
    setLoading(true);
    setLocalError(null);
    setGames(null);
    try {
      const result = await listGames(username.trim());
      if (result.length === 0) setLocalError("No games found for that username.");
      setGames(result);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveUrl() {
    if (!urlInput.trim()) return;
    setLoading(true);
    setLocalError(null);
    try {
      const pgn = await resolveUrl(urlInput.trim());
      onPgnResolved(pgn);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-4 text-xs">
        <label className="flex items-center gap-1.5 text-neutral-400">
          <input
            type="radio"
            checked={mode === "username"}
            onChange={() => setMode("username")}
          />
          By username
        </label>
        <label className="flex items-center gap-1.5 text-neutral-400">
          <input type="radio" checked={mode === "url"} onChange={() => setMode("url")} />
          By game URL
        </label>
      </div>

      {mode === "username" ? (
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleListGames()}
            placeholder="username"
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={disabled || loading || !username.trim()}
            onClick={handleListGames}
            className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading…" : "Find games"}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResolveUrl()}
              placeholder={urlPlaceholder}
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={disabled || loading || !urlInput.trim()}
              onClick={handleResolveUrl}
              className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Loading…" : "Import"}
            </button>
          </div>
          <p className="text-xs text-neutral-500">{urlHint}</p>
        </div>
      )}

      {localError && <p className="text-center text-sm text-red-400">{localError}</p>}

      {games && games.length > 0 && (
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 p-1.5">
          {games.map((g) => (
            <button
              key={g.id}
              type="button"
              disabled={disabled}
              onClick={() => onPgnResolved(g.pgn)}
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-800"
            >
              <p className="text-neutral-100">{g.title}</p>
              <p className="text-xs text-neutral-500">{g.subtitle}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function SpeedButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-neutral-100 bg-neutral-100 text-neutral-900"
          : "border-neutral-700 text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}
