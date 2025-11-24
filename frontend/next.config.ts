import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  env: {
    // API_BASE_URL: process.env.NEXT_PUBLIC_APP_ENV === "development" || process.env.NEXT_PUBLIC_APP_ENV === undefined ? "http://localhost:3000" : 'https://lovable-clone-bu9m.onrender.com'
    API_BASE_URL: "http://localhost:3000"
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
  },
  outputFileTracingRoot: path.join(__dirname, "../"),
  // ⭐ Tell Next.js to ignore all /api routes
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // destination: process.env.NEXT_PUBLIC_APP_ENV === "development" || process.env.NEXT_PUBLIC_APP_ENV === undefined ? 'http://localhost:3000/api/:path*' : 'https://lovable-clone-bu9m.onrender.com/api/:path*', // Your Express backend
        destination:'http://localhost:3000/api/:path*'
      },
    ];
  },
};

export default nextConfig;
