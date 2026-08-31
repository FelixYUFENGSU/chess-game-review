import { analyzeGame } from "@/lib/engine/analyzeGame";

const SAMPLE_PGN = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6
8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8
14. Ng3 g6 15. Bg5 h6 16. Bd2 Bg7 17. a4 c5 1-0`;

async function main() {
  console.time("analysis");
  for await (const event of analyzeGame(SAMPLE_PGN, "quick")) {
    if (event.type === "progress") {
      process.stdout.write(`\rply ${event.ply}/${event.total}`);
    } else if (event.type === "done") {
      console.log("\ndone");
      console.log("opening:", event.analysis.opening);
      console.log("white:", event.analysis.white.summary);
      console.log("black:", event.analysis.black.summary);
      console.log("keyMoments:", event.analysis.keyMoments);
      for (const m of event.analysis.moves.slice(0, 6)) {
        console.log(m.ply, m.san, m.classification, "-", m.explanation);
      }
      console.log("...");
      for (const m of event.analysis.moves.slice(-4)) {
        console.log(m.ply, m.san, m.classification, "-", m.explanation);
      }
    } else if (event.type === "error") {
      console.error("ERROR:", event.message);
    }
  }
  console.timeEnd("analysis");
  process.exit(0);
}

main();
