import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/prescreve-ai',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
