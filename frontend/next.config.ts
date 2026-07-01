import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  ...(isVercel
    ? { images: { unoptimized: true } }
    : {
        output: 'export',
        basePath: '/prescreve-ai',
        trailingSlash: true,
        images: { unoptimized: true },
      }),
};

export default nextConfig;
