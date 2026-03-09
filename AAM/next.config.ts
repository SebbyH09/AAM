import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Vercel automatically handles serverless functions and edge middleware.
  // All pages using 'force-dynamic' will be server-rendered on each request.
};

export default nextConfig;
