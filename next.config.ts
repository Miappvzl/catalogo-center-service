import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Dominio del proyecto NUEVO autorizado para compresión Edge por Vercel
        hostname: 'qzeelmmhictsabuwbyjh.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;