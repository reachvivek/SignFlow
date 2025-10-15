import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack resolves the frontend folder as the workspace root.
  // This prevents Turbopack from inferring the monorepo root and mixing
  // modules (which can cause HMR "module factory not available" errors).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
