import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com', 'randomuser.me', 'picsum.photos', "i.pravatar.cc"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot : path.join(__dirname, "../"),
};

export default nextConfig;
