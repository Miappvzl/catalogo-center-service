import LandingClient from '@/components/LandingClient';
import { Metadata } from 'next';

// --- METADATOS SEO (CRUCIAL PARA GOOGLE) ---
export const metadata: Metadata = {
  title: 'Preziso | Automatización de Tasa BCV para E-commerce en Venezuela',
  description: 'Olvídate de calcular la tasa. Preziso actualiza tus precios automáticamente según el BCV y organiza tus pedidos de WhatsApp.',
  keywords: ['tasa bcv', 'ecommerce venezuela', 'tienda online venezuela', 'automatizacion ventas', 'catalogo digital'],
  openGraph: {
    title: 'Preziso - Vende en Dólares, Cobra en Bs (Automático)',
    description: 'Sistema operativo para comercios en Venezuela. Sincronización BCV 24/7.',
    type: 'website',
    // images: ['/og-image.jpg'], // Recuerda agregar una imagen luego
  }
};

// Optimizamos para que sea una página estática ultra rápida (SEO Friendly)
// Si necesitas que sea dinámica por alguna razón, cambia a 'force-dynamic'
export const dynamic = 'force-static'; 

export default function Home() {
  // NOTA: Hemos eliminado la lógica de Supabase (productos y dólar) 
  // porque esta es la página de Marketing del Software, no la tienda de un cliente.
  // La carga de productos se hará en las rutas de las tiendas (ej: /[slug]).
  
  return <LandingClient />;
}