import LandingClient from '@/components/LandingClient';
import { Metadata } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// --- METADATOS SEO (CRUCIAL PARA GOOGLE) ---
export const metadata: Metadata = {
  title: 'Preziso | Automatización de Tasa BCV para E-commerce en Venezuela',
  description: 'Olvídate de calcular la tasa. Preziso actualiza tus precios automáticamente según el BCV y organiza tus pedidos de WhatsApp.',
  keywords: ['tasa bcv', 'ecommerce venezuela', 'tienda online venezuela', 'automatizacion ventas', 'catalogo digital'],
  openGraph: {
    title: 'Preziso - Vende en Dólares, Cobra en Bs (Automático)',
    description: 'Sistema operativo para comercios en Venezuela. Sincronización BCV 24/7.',
    type: 'website',
  }
};

// 🚀 OBLIGATORIO: Debe ser dinámico para consultar Supabase en vivo
export const dynamic = 'force-dynamic'; 

export default async function Home() {
  // 1. Conexión al servidor de Supabase
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  // 2. Extraemos la tasa (buscamos la fila con id=1)
  const { data: config } = await supabase.from('app_config').select('usd_rate').eq('id', 1).single();
  
  // 3. Fallback: Si por algún motivo falla la BD, usamos 38.45 en lugar de undefined
  const bcvRate = config?.usd_rate ?? 38.45;

  // 4. Inyectamos la tasa (ESTO ES LO QUE ARREGLA EL NaN)
  return <LandingClient liveRate={bcvRate} />;
}