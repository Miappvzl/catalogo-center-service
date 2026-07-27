import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Preziso',
    short_name: 'Preziso',
    description: 'El sistema inteligente de gestión y ventas multimoneda.',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#0d0d0d',
theme_color: '#0d0d0d',
icons: [
  { src: '/favicon-dark.png', sizes: '192x192 512x512', type: 'image/png', purpose: 'any' },
  { src: '/favicon-dark.png', sizes: '192x192 512x512', type: 'image/png', purpose: 'maskable' }
]
  }
}