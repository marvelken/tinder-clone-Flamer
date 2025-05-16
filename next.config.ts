import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lmlfxitoxkgztkcvmgog.supabase.co",
      },
    ],
  },
};

export default nextConfig;