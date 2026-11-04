import type { NextConfig } from "next";

// Deployed as a static site to GitHub Pages (project site), which serves the
// app under /<repo-name>. The deploy workflow sets NEXT_PUBLIC_BASE_PATH;
// locally it is empty and the app runs at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Emit /new/index.html etc. so GitHub Pages resolves /new/ without rewrites.
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  reactStrictMode: true,
};

export default nextConfig;
