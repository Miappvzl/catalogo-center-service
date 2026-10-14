import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En tu next.config.ts añade estas direcciones explícitas:
  allowedDevOrigins: [
    '192.168.1.8.sslip.io', 
    '*.192.168.1.8.sslip.io', 
    'sslip.io', 
    '*.sslip.io'
  ],
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
        hostname: 'wandering-surf-2d0c.quanzosinc-179.workers.dev', // Añade tu Worker aquí
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lrmhgzohfclrepwvrhdy.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // 🛡️ CABECERAS HTTP DE SEGURIDAD Y DESINDEXACIÓN (SEO QUIRÚRGICO)
  async headers() {
    return [
      {
        // Aplica a /admin y a todas sus subrutas (/admin/pos, /admin/inventory, etc.)
        source: "/admin/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        // Blindamos preventivamente el panel de super-administrador (/boss)
        source: "/boss/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;