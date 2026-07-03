import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === '1';

const securityHeaders = [
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'X-Frame-Options',          value: 'DENY' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security',value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  ...(isVercel
    ? {
        images: { unoptimized: true },
        async headers() {
          return [{ source: '/(.*)', headers: securityHeaders }];
        },
      }
    : {
        output: 'export',
        basePath: '/prescreve-ai',
        trailingSlash: true,
        images: { unoptimized: true },
      }),
};

export default nextConfig;
