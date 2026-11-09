import type { NextConfig } from "next";
import { recruitmentBasePath } from "./lib/site-paths";

const nextConfig: NextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  ...(recruitmentBasePath && { basePath: recruitmentBasePath, distDir: "build/combined" }),
  ...(process.env.NEXT_PUBLIC_ALPHA_COMBINED_SITE === "1" && process.env.NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW !== "1" && {
    async redirects() {
      return [{ source: "/", destination: "https://aws-sbg-alpha.vercel.app/recruitment", basePath: false, permanent: false }];
    },
  }),
  devIndicators: false,
  experimental: {
    agentFeedback: true,
    serverActions: {
      allowedOrigins: ["aws-sbg-alpha.vercel.app", "www.awsc-alpha.cloud", "awsc-alpha.cloud"],
    },
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
