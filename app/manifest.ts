import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Preziso',
    short_name: 'Preziso',
    description: 'El sistema inteligente de gestión y ventas multimoneda.',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#0d0d0d', // Pantalla de carga oscura para evitar flashazos de noche
    theme_color: '#0d0d0d',
    icons: [
      {
        src: '/favicon-dark.png', // 👈 Z BLANCA: Forzada exclusivamente para la Pantalla de Carga
        sizes: '512x512',         // 👈 Único tamaño de alta resolución disponible
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon-light.png', // 👈 Z NEGRA: Forzada exclusivamente para el Icono de Escritorio
        sizes: '192x192',          // 👈 Único tamaño estándar disponible
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}