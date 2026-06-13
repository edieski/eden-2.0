import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silence the workspace root warning caused by multiple lockfiles
  outputFileTracingRoot: path.join(__dirname),

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
