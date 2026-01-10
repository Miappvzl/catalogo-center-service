import LandingPage from './landing/page' // Importamos la Landing que ya creaste
import { supabase } from '@/lib/supabase'; // Importamos la conexión nueva\




// Evitamos caché para que si cambias el precio, se vea al instante
export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Pedir Productos y Dólar a Supabase en paralelo (Súper rápido)
 // ... imports y setup anterior ...

  const shopOwnerId = process.env.NEXT_PUBLIC_SHOP_OWNER_ID;
 

  // Si no hay ID configurado, lanzamos error en consola para avisarte
  if (!shopOwnerId) console.warn("⚠️ ALERTA: No se ha configurado el ID del dueño de la tienda.");

  // 1. Pedir Productos (FILTRADO POR DUEÑO)
  const productsPromise = supabase
    .from('products')
    .select('*')
    .eq('user_id', shopOwnerId) 
    .order('id', { ascending: true });

  
  const configPromise = supabase.from('config').select('value').eq('key', 'dolar_rate').single();

  const [productsRes, configRes] = await Promise.all([productsPromise, configPromise]);

  // 2. Mapear los datos de SQL a tu formato visual
  // Nota: En la DB las columnas son minusculas (usd_cash_price), pero tu UI espera Mayusculas (USD_Cash_Price)
  // Vamos a transformar los datos aquí para no romper tu componente Store.
  
  const products = (productsRes.data || []).map(p => ({
    Name: p.name,
    Category: p.category,
    Image_Url: p.image_url,
    USD_Cash_Price: p.usd_cash_price?.toString() || '0',
    USD_Penalty: p.usd_penalty?.toString() || '0', // Aquí viaja tu lógica de penalización
    Sizes: p.sizes
  }));

  const dolarRate = configRes.data?.value || 0;

  // 3. Renderizar

   return <LandingPage />
  
}