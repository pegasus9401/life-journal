import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

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

export default withWorkflow(nextConfig);
