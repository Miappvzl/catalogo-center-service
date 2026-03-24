import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Preziso',
    short_name: 'Preziso',
    description: 'El sistema inteligente de gestión y ventas multimoneda.',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#F6F6F6',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon-light.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon-light.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}