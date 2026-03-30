import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // 🚀 PROYECTO NUEVO (Para todas las imágenes y pedidos futuros)
        hostname: 'qzeelmmhictsabuwbyjh.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        // 🕰️ PROYECTO VIEJO (Retrocompatibilidad para cargar recibos históricos)
        hostname: 'lrmhgzohfclrepwvrhdy.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;