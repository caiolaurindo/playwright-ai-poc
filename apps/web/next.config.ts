import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@uigovpe/components"],
  async rewrites() {
    if (process.env.VERCEL) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://127.0.0.1:3001"}/api/:path*`,
      },
    ];
  },
};
export default config;
