import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Reemplaza esto con TU dominio de Supabase (sin el https://)
        // Ejemplo: 'abcdefg.supabase.co'
        hostname: 'lrmhgzohfclrepwvrhdy.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;


