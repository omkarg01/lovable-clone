import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com', 'randomuser.me', 'picsum.photos', "i.pravatar.cc"],
  },
  outputFileTracingRoot: path.join(__dirname, "../"),
  // ⭐ Tell Next.js to ignore all /api routes
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.NEXT_PUBLIC_APP_ENV === "development" ? 'http://localhost:3000/api/:path*' : 'https://lovable-clone-bu9m.onrender.com/api/:path*', // Your Express backend
      },
    ];
  },
};

export default nextConfig;
