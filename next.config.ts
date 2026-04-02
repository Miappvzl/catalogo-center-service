import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Lo mantenemos así para ahorrar en Vercel
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.preziso.shop', // 🚀 NUESTRO NUEVO CDN
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'qzeelmmhictsabuwbyjh.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lrmhgzohfclrepwvrhdy.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;