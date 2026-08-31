import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The "stockfish" package loads its WASM engine via dynamic fs.readFileSync/require
  // relative to node_modules — keep it out of the server bundle so Node's native
  // require resolves it at runtime instead of webpack trying to statically bundle it.
  serverExternalPackages: ["stockfish"],
  // serverExternalPackages makes Next.js's file tracer conservatively include
  // the *entire* stockfish package directory in the deployed function bundle
  // (since it can't statically see the dynamic require() inside it) — that's
  // every engine variant the package ships, including two ~113MB full-strength
  // builds we never use. lib/engine/stockfish.ts only ever loads
  // "lite-single" (~7MB), so explicitly exclude the rest to keep the deployed
  // function well under a serverless size limit and its cold start fast.
  outputFileTracingExcludes: {
    "/api/analyze": [
      "node_modules/stockfish/bin/stockfish-18-asm.js",
      "node_modules/stockfish/bin/stockfish-18.js",
      "node_modules/stockfish/bin/stockfish-18.wasm",
      "node_modules/stockfish/bin/stockfish-18-single.js",
      "node_modules/stockfish/bin/stockfish-18-single.wasm",
      "node_modules/stockfish/bin/stockfish-18-lite.js",
      "node_modules/stockfish/bin/stockfish-18-lite.wasm",
      "node_modules/stockfish/bin/stockfish.js",
      "node_modules/stockfish/bin/stockfish.wasm",
    ],
  },
};

export default nextConfig;
