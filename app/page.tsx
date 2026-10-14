import LandingClient from '@/components/LandingClient';
import StructuredData from '@/components/StructuredData'; // 🚀 INYECCIÓN SEO DE ENTIDAD
import { Metadata } from 'next';
import { createPublicCachedClient } from '@/utils/supabaseServer';

// --- METADATOS SEO ENTERPRISE (INDEXACIÓN CANÓNICA Y PALABRAS CLAVE) ---
export const metadata: Metadata = {
  metadataBase: new URL('https://www.preziso.shop'),
  title: 'Preziso | Punto de Venta POS & Tienda Online en Venezuela con Tasa BCV',
  description: 'Punto de Venta (POS) multimoneda y catálogo virtual para WhatsApp. Sincronización oficial de Tasa BCV en tiempo real, cobro en dólares, Zelle y Pago Móvil sin descuadres.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Preziso | Punto de Venta POS & Catálogo WhatsApp en Venezuela',
    description: 'Control financiero absoluto, sincronización automática de Tasa BCV y pagos mixtos en dólares y bolívares.',
    url: 'https://www.preziso.shop',
    siteName: 'Preziso',
    type: 'website',
  },
};

// 🚀 ISR: Regeneración estática cada 60 segundos en el Edge (Caché pura = LCP ultrarrápido)
export const revalidate = 60; 

export default async function Home() {
  // 1. Conexión al servidor usando el cliente cacheado
  const supabase = createPublicCachedClient();

  // 2. Extraemos la tasa (fila id=1)
  const { data: config } = await supabase
    .from('app_config')
    .select('usd_rate')
    .eq('id', 1)
    .single();
  
  // 3. Fallback contemporáneo por si ocurre una caída temporal de conexión
  const bcvRate = config?.usd_rate ?? 850.00;

  // 4. Inyección: Entidad estructurada para Google + Interfaz del Cliente
  return (
    <>
      <StructuredData />
      <LandingClient liveRate={bcvRate} />
    </>
  );
}