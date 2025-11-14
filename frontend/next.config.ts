import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  env: {
    API_BASE_URL: "http://localhost:3000"
  },
  images: {
    domains: ['images.unsplash.com', 'randomuser.me', 'picsum.photos', "i.pravatar.cc"],
  },
  outputFileTracingRoot: path.join(__dirname, "../"),
  // ⭐ Tell Next.js to ignore all /api routes
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: 'http://localhost:3000/api/:path*', // Your Express backend
      },
    ];
  },
};

export default nextConfig;
