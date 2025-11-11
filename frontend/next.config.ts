import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com', 'randomuser.me', 'picsum.photos', "i.pravatar.cc"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
