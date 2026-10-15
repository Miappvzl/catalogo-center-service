'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Loader2, AlertCircle, ArrowRight, MessageCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useCart } from '@/app/store/useCart';

interface OrderSummary {
  id: string;
  orderNumber: number;
  customerName: string;
  totalUsd: number;
  totalBs: number;
  storeSlug?: string;
  storePhone?: string;
  status: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();

  const [state, setState] = useState<'verifying' | 'paid' | 'pending_bank' | 'not_found'>('verifying');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const tokenParam = searchParams.get('token');
  const buyOrderParam = searchParams.get('buyOrder');

  const verifyPayment = useCallback(async (token: string | null, orderId: string | null) => {
    try {
      const res = await fetch('/api/checkout/skylink/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, orderId }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.status === 'paid') {
        const o = data.order;
        setOrder({
          id: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          totalUsd: Number(o.total_usd),
          totalBs: Number(o.total_bs),
          status: 'paid',
        });
        setState('paid');
        clearCart();
        localStorage.removeItem('pz_last_skylink_order');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [clearCart]);

  useEffect(() => {
    // 1. Obtener identificadores: URL Query Params o LocalStorage Fallback
    let activeToken = tokenParam;
    let cachedOrder: any = null;

    try {
      const raw = localStorage.getItem('pz_last_skylink_order');
      if (raw) cachedOrder = JSON.parse(raw);
    } catch {}

    const targetToken = activeToken || cachedOrder?.token || null;
    const targetOrderId = cachedOrder?.orderId || null;

    if (!targetToken && !targetOrderId && !buyOrderParam) {
      setState('not_found');
      return;
    }

    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 6; // 6 intentos cada 2.5s = 15 segundos de tolerancia bancaria

    const runCheck = async () => {
      const confirmed = await verifyPayment(targetToken, targetOrderId);
      attempts++;
      setRetryCount(attempts);

      if (confirmed) {
        clearInterval(intervalId);
      } else if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        setState('pending_bank');
        if (cachedOrder) {
          setOrder({
            id: cachedOrder.orderId,
            orderNumber: cachedOrder.orderNumber,
            customerName: cachedOrder.customerName || 'Cliente',
            totalUsd: cachedOrder.totalUsd || 0,
            totalBs: cachedOrder.totalBs || 0,
            status: 'pending',
          });
        }
      }
    };

    runCheck();
    intervalId = setInterval(runCheck, 2500);

    return () => clearInterval(intervalId);
  }, [tokenParam, buyOrderParam, verifyPayment]);

  const handleManualRetry = () => {
    setState('verifying');
    setRetryCount(0);
    let cached: any = null;
    try {
      cached = JSON.parse(localStorage.getItem('pz_last_skylink_order') || '{}');
    } catch {}
    verifyPayment(tokenParam || cached?.token, cached?.orderId);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 antialiased font-sans text-neutral-900">
      <div className="w-full max-w-md bg-white border border-neutral-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        
        {/* ESTADO 1: VERIFICANDO CONCURRENCIA */}
        {state === 'verifying' && (
          <div className="flex flex-col items-center text-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
              <Loader2 className="animate-spin text-neutral-900" size={20} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-bold tracking-tight">Verificando Pago Móvil</h1>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
                Conciliando la operación con la red interbancaria en tiempo real...
              </p>
            </div>
            <span className="text-[10px] font-mono font-medium text-neutral-400">
              Sincronización {retryCount}/6
            </span>
          </div>
        )}

        {/* ESTADO 2: PAGO CONFIRMADO (ÉXITO TOTAL) */}
        {state === 'paid' && (
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="w-12 h-12 rounded-full bg-neutral-950 text-white flex items-center justify-center shadow-sm">
                <Check size={22} strokeWidth={2} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  Transacción Aprobada
                </span>
                <h1 className="text-xl font-black tracking-tight">
                  Orden #{order?.orderNumber}
                </h1>
                <p className="text-xs text-neutral-500">
                  Tu pago ha sido validado e ingresado a la tienda.
                </p>
              </div>
            </div>

            {/* Recibo Editorial */}
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/50 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-neutral-200/40">
                <span className="text-neutral-500 font-medium">Método</span>
                <span className="font-bold text-neutral-900">Pago Móvil Automatizado</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-neutral-200/40">
                <span className="text-neutral-500 font-medium">Titular</span>
                <span className="font-bold text-neutral-900">{order?.customerName}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs text-neutral-500 font-medium">Total Liquidado</span>
                <div className="text-right">
                  <span className="text-base font-black font-mono block">
                    ${order?.totalUsd.toFixed(2)} USD
                  </span>
                  <span className="text-[11px] font-bold text-neutral-400 font-mono">
                    Bs. {order?.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-neutral-950 text-white hover:bg-neutral-900 py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <span>Volver a la Tienda</span>
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 3: EN PROCESO BANCARIO (FALLBACK DE TOLERANCIA) */}
        {state === 'pending_bank' && (
          <div className="flex flex-col space-y-6 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle size={22} strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-base font-bold tracking-tight">Procesando en Red Bancaria</h1>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Tu transferencia fue recibida por Skylink y se encuentra en proceso de compensación final. Tu orden #{order?.orderNumber} se actualizará en unos instantes.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleManualRetry}
                className="w-full bg-neutral-950 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <RefreshCw size={13} strokeWidth={1.5} />
                <span>Reintentar Verificación</span>
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full bg-transparent hover:bg-neutral-100 text-neutral-600 py-3 rounded-xl text-xs font-bold transition-all"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 4: ORDEN NO ENCONTRADA */}
        {state === 'not_found' && (
          <div className="flex flex-col space-y-4 text-center py-6">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <AlertCircle size={22} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-bold tracking-tight">Sin Transacción Activa</h1>
              <p className="text-xs text-neutral-500">
                No se detectó ninguna sesión de pago pendiente en este navegador.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-2 w-full bg-neutral-950 text-white py-3 rounded-xl text-xs font-bold"
            >
              Ir al Catálogo
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-neutral-900" size={24} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}