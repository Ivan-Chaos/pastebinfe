import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  reactStrictMode: true,
  async redirects() {
    // Legacy share links from the original HANDOFF spec.
    return [{ source: "/s/:id", destination: "/snippet/:id", permanent: false }];
  },
};

export default nextConfig;
