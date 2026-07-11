import { createClient } from '@/utils/supabaseServer';
import { notFound } from 'next/navigation';
import StoreCreditCard from '@/components/passport/StoreCreditCard';
import { Metadata } from 'next';
import { UserCircle, Heart, Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ShippingProfileForm from '@/components/passport/ShippingProfileForm';
import { headers } from 'next/headers'; // 🚀 IMPORTACIÓN AGREGADA PARA LECTURA DE HOST EN SSR
import { getOptimizedUrl } from '@/utils/cdn';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: `Mi Perfil | ${store?.name || 'Preziso'}`,
    description: 'Gestiona tu saldo a favor, favoritos y datos de envío.',
  };
}

export default async function PassportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // 🚀 DETECTAR SUBDOMINIO EN EL SERVIDOR PARA ENRUTAMIENTO DE RETORNO SEGURO
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isSubdomain = 
    host.includes('.') && 
    !host.startsWith('www.') && 
    !host.includes('localhost') && 
    !host.startsWith('preziso.shop');

  // Si estamos en subdominio el inicio es "/", si estamos en subcarpeta o localhost es "/[slug]"
  const homeHref = isSubdomain ? '/' : `/${slug}`;

  // 1. OBTENER TIENDA Y USUARIO (En paralelo para reducir latencia)
  const [storeResponse, authResponse] = await Promise.all([
    supabase.from('stores').select('id, name, logo_url').eq('slug', slug).single(),
    supabase.auth.getUser(),
  ]);

  const store = storeResponse.data;
  const user = authResponse.data.user;

  if (!store) {
    return notFound();
  }

  // 2. PROTECCIÓN DE RUTA: Si no hay usuario, mostramos un estado de acceso denegado elegante
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <UserCircle size={40} className="text-black" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-black tracking-tight">Acceso Restringido</h1>
            <p className="text-gray-500 font-medium">
              Inicia sesión para acceder a tu perfil, saldo a favor y favoritos en {store.name}.
            </p>
          </div>
         <Link 
            href={homeHref} // 🚀 CORREGIDO CON HOMEHREF DINÁMICO
            className="mt-4 bg-black text-white px-8 py-4 rounded-xl font-medium tracking-wide shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-gray-900 transition-all"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  // 3. OBTENER DATOS DEL PASSPORT (Saldo, Historial, Favoritos, Perfil)
  
  // 3.1 Perfil del cliente
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.id)
    .single();

  // 3.2 Saldo a favor en esta tienda específica
  const { data: credit } = await supabase
    .from('store_credits')
    .select('id, balance_usd')
    .eq('store_id', store.id)
    .eq('customer_id', user.id)
    .single();

  const balanceUsd = credit?.balance_usd || 0;

  // 3.3 Historial de movimientos (Solo si existe un registro de crédito)
  let ledger: any[] = [];
  if (credit) {
    const { data: ledgerData } = await supabase
      .from('store_credit_ledger')
      .select('*')
      .eq('store_credit_id', credit.id)
      .order('created_at', { ascending: false })
      .limit(10);
    ledger = ledgerData || [];
  }

  // 3.4 Favoritos en esta tienda
  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      id,
      product_id,
      products (
        id,
        name,
        image_url,
        usd_cash_price
      )
    `)
    .eq('store_id', store.id)
    .eq('customer_id', user.id);

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* HEADER MINIMALISTA */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href={homeHref} className="flex items-center gap-3 text-black hover:opacity-70 transition-opacity">
            <ArrowLeft size={20} />
            <span className="font-medium tracking-wide">Volver a {store.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <UserCircle size={18} className="text-black" />
            </div>
            <span className="text-sm font-semibold text-black hidden sm:block">
              {customer?.full_name || user.email?.split('@')[0] || 'Mi Perfil'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8 flex flex-col lg:flex-row gap-12">
        
        {/* COLUMNA IZQUIERDA: MOTOR DE RETENCIÓN (SALDO) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-8">
          <StoreCreditCard 
            storeName={store.name}
            balanceUsd={balanceUsd}
            ledger={ledger}
            customerId={user.id}
            storeId={store.id}
          />

          {/* 🚀 FORMULARIO CONTENEDOR DE IDENTIDAD UNIFICADA Y CHECKOUT 1-CLICK */}
          <ShippingProfileForm 
            customerId={user.id} 
            initialData={{
              full_name: customer?.full_name || '',
              phone: customer?.phone || '',
              dni: customer?.dni || '',
              shipping_details: customer?.shipping_details || {}
            }} 
          />
        </div>

        {/* COLUMNA DERECHA: INTENCIÓN DE COMPRA (FAVORITOS) */}
        <div className="w-full lg:w-2/3 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-black tracking-tight flex items-center gap-3">
              <Heart size={24} className="text-black" fill="currentColor" />
              Mis Favoritos
            </h2>
            <span className="text-sm font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
              {favorites?.length || 0} guardados
            </span>
          </div>

          {!favorites || favorites.length === 0 ? (
            <div className="bg-gray-50 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2 border-transparent">
              <Heart size={48} className="text-gray-300" strokeWidth={1} />
              <p className="text-gray-500 font-medium max-w-sm">
                Aún no tienes productos guardados. Explora el catálogo y guarda lo que te gusta para más tarde.
              </p>
             <Link 
                href={homeHref} // 🚀 CORREGIDO CON HOMEHREF DINÁMICO
                className="mt-2 text-black font-semibold hover:underline underline-offset-4"
              >
                Explorar catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {favorites.map((fav: any) => (
                <div key={fav.id} className="bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex gap-4 group cursor-pointer">
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative">
                    {fav.products?.image_url ? (
                      <img 
                        src={getOptimizedUrl(fav.products.image_url)} 
                        alt={fav.products.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-1">
                    <h4 className="font-medium text-black leading-tight line-clamp-2">
                      {fav.products?.name}
                    </h4>
                    <span className="text-lg font-light text-black">
                      ${fav.products?.usd_cash_price?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </main>
    </div>
  );
}