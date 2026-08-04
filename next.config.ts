import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gggimncjzkelnrihmvht.supabase.co",
        pathname: "/storage/v1/object/sign/journal-photos/**",
      },
    ],
  },
};

export default nextConfig;
