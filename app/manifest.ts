import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Preziso',
    short_name: 'Preziso',
    description: 'El sistema inteligente de gestión y ventas multimoneda.',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#0d0d0d', // 👈 Fondo negro de alta gama para evitar flashazos de noche
    theme_color: '#0d0d0d',      // 👈 Barra de estado por defecto del manifest sincronizada
    icons: [
      {
        src: '/favicon-circle.png', // 👈 Ícono circular sólido de alto contraste para rejillas adaptables
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon-circle.png', // 👈 Ícono circular para máscaras del sistema
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}