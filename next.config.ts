import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // 🚀 BYPASS: Apaga el motor de cobro de Vercel
    remotePatterns: [
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