import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev only: lets the LAN address serve HMR/dev resources so the site can be
  // previewed from another device or a browser that will not resolve localhost
  allowedDevOrigins: ["10.0.28.99", "127.0.0.1", "localhost"],
};

export default nextConfig;
