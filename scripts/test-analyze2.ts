import { analyzeGame } from "@/lib/engine/analyzeGame";

// Legal Trap-ish game: Black blunders the queen with 7...Bxg5, then White mates.
const SAMPLE_PGN = `[Event "Test2"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0`;

async function main() {
  for await (const event of analyzeGame(SAMPLE_PGN, "quick")) {
    if (event.type === "progress") {
      process.stdout.write(`\rply ${event.ply}/${event.total}`);
    } else if (event.type === "done") {
      console.log("\ndone");
      for (const m of event.analysis.moves) {
        console.log(
          m.ply,
          m.san,
          m.classification,
          `cpBefore=${m.evalBefore.cp} cpAfter=${m.evalAfter.cp}`,
          "-",
          m.explanation
        );
      }
      console.log("keyMoments:", event.analysis.keyMoments);
    } else if (event.type === "error") {
      console.error("ERROR:", event.message);
    }
  }
  process.exit(0);
}

main();
