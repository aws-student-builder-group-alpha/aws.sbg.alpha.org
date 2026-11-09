import type { NextConfig } from "next";
import { recruitmentBasePath } from "./lib/site-paths";

const nextConfig: NextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  ...(recruitmentBasePath && { basePath: recruitmentBasePath }),
  distDir: process.env.NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW === "1" ? "build/combined" : ".next",
  devIndicators: false,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
