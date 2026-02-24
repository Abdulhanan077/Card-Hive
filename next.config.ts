import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "pub-8f7cbf9bd50641448937a36053e003af.r2.dev",
      },
    ],
  },
};

export default nextConfig;
