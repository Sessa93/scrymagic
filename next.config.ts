import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    dangerouslyAllowSVG: true,
    minimumCacheTTL: 2_592_000, // 30 days
    localPatterns: [
      {
        pathname: "/api/img",
        // omitting `search` allows any query string (Next.js docs behaviour)
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cards.scryfall.io",
      },
      {
        protocol: "https",
        hostname: "svgs.scryfall.io",
      },
    ],
  },
  output: "standalone",
};

export default nextConfig;
