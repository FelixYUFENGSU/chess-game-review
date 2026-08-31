import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The "stockfish" package loads its WASM engine via dynamic fs.readFileSync/require
  // relative to node_modules — keep it out of the server bundle so Node's native
  // require resolves it at runtime instead of webpack trying to statically bundle it.
  serverExternalPackages: ["stockfish"],
};

export default nextConfig;
