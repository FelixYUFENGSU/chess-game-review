import type { Classification } from "@/lib/types";
import { CLASSIFICATION_INFO } from "@/lib/types";

const GLYPH: Record<Classification, string> = {
  brilliant: "!!",
  great: "!",
  best: "★",
  excellent: "✓",
  good: "✓",
  book: "",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
  miss: "✕",
};

/** Round colored badge for a move classification (used on the board, in the coach panel and the move list). */
export default function ClassificationIcon({
  classification,
  size = 20,
  className = "",
}: {
  classification: Classification;
  size?: number;
  className?: string;
}) {
  const info = CLASSIFICATION_INFO[classification];
  const glyph = GLYPH[classification];
  return (
    <span
      role="img"
      aria-label={info.label}
      title={info.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold leading-none text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: info.color,
        fontSize: size * (glyph.length > 1 ? 0.48 : 0.6),
        boxShadow: "0 1px 2px rgba(0,0,0,.45)",
      }}
    >
      {classification === "book" ? <BookGlyph size={size * 0.58} /> : glyph}
    </span>
  );
}

function BookGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 7.2C10.4 5.9 8.2 5.2 5.4 5.2c-.8 0-1.4.6-1.4 1.4v10.2c0 .6.5 1 1.1 1 2.6 0 4.8.7 6.9 2.1 2.1-1.4 4.3-2.1 6.9-2.1.6 0 1.1-.4 1.1-1V6.6c0-.8-.6-1.4-1.4-1.4-2.8 0-5 .7-6.6 2Z"
        fill="currentColor"
      />
      <path d="M12 7.6v11.6" stroke="rgba(0,0,0,.35)" strokeWidth="1.4" />
    </svg>
  );
}
