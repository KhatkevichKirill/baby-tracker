import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@baby-tracker/shared"],
  output: "standalone"
};

export default nextConfig;
