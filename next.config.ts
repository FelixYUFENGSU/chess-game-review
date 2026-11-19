import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The "stockfish" package loads its WASM engine via dynamic fs.readFileSync/require
  // relative to node_modules — keep it out of the server bundle so Node's native
  // require resolves it at runtime instead of webpack trying to statically bundle it.
  serverExternalPackages: ["stockfish"],
  // serverExternalPackages makes Next.js's file tracer conservatively include
  // the *entire* stockfish package directory in the deployed function bundle
  // (since it can't statically see the dynamic require() inside it) — that's
  // every engine variant the package ships. lib/engine/stockfish.ts only loads
  // the full-strength single-threaded build ("single", ~113MB), so exclude the
  // other variants (especially the second ~113MB multi-threaded build) to keep
  // the deployed function under the serverless size limit.
  outputFileTracingExcludes: {
    "/api/analyze": [
      "node_modules/stockfish/bin/stockfish-18-asm.js",
      "node_modules/stockfish/bin/stockfish-18.js",
      "node_modules/stockfish/bin/stockfish-18.wasm",
      "node_modules/stockfish/bin/stockfish-18-lite-single.js",
      "node_modules/stockfish/bin/stockfish-18-lite-single.wasm",
      "node_modules/stockfish/bin/stockfish-18-lite.js",
      "node_modules/stockfish/bin/stockfish-18-lite.wasm",
      "node_modules/stockfish/bin/stockfish.js",
      "node_modules/stockfish/bin/stockfish.wasm",
    ],
  },
};

export default nextConfig;
