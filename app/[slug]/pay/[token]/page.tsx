import React from 'react';
import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import StandaloneCheckoutClient from '@/components/checkout/StandaloneCheckoutClient';

interface PageProps {
  params: Promise<{
    slug: string;
    token: string;
  }>;
}

export default async function QuickPaymentPage({ params }: PageProps) {
  const { slug, token } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // 1. Cargar la tienda con todas sus configuraciones operativas
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*, payment_config, shipping_config, theme_config')
    .eq('slug', slug)
    .single();

  if (storeError || !store) {
    notFound();
  }

  // 2. Cargar el enlace de cobro por token (id) y verificar aislamiento multi-tenant
  const { data: link, error: linkError } = await supabase
    .from('payment_links')
    .select('*')
    .eq('id', token)
    .eq('store_id', store.id)
    .single();

  if (linkError || !link) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
            <AlertCircle className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-neutral-950">Enlace no disponible</h1>
            <p className="text-xs text-neutral-500 font-normal leading-relaxed">
              Este enlace de cobro no existe o fue cancelado por el comercio.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 3. Comprobar si ya fue liquidado
  if (link.status === 'paid') {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-neutral-950">Cobro liquidado</h1>
            <p className="text-xs text-neutral-500 font-normal leading-relaxed">
              Este enlace de pago ya ha sido procesado exitosamente por {store.name}.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 4. Comprobar si ha expirado
  const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;
  if (isExpired) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
            <Clock className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-neutral-950">Enlace expirado</h1>
            <p className="text-xs text-neutral-500 font-normal leading-relaxed">
              El tiempo límite para este cobro ha vencido. Solicita un nuevo enlace a {store.name}.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 5. Consultar tasa oficial de app_config (Tasa Flotante en Vivo)
  const { data: config } = await supabase
    .from('app_config')
    .select('usd_rate, eur_rate, google_maps_api_key')
    .eq('id', 1)
    .single();

  const rates = {
    usd: Number(config?.usd_rate || 0),
    eur: Number(config?.eur_rate || 0),
  };

  const storeWithMaps = {
    ...store,
    google_maps_api_key: config?.google_maps_api_key || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  };

  return (
    <StandaloneCheckoutClient
      store={storeWithMaps}
      link={link}
      rates={rates}
    />
  );
}