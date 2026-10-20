'use client'

import { useState, useEffect } from 'react'
import { Loader2, Bitcoin, QrCode, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion } from 'framer-motion'
import Swal from 'sweetalert2'

interface BinanceGatewayProps {
  storeId: string;
  clientData: any;
  orderData: any;
  items: any[];
  onSuccess: (orderNumber: number, whatsappUrl: string, orderId: string) => void;
}

export default function BinanceGateway({ storeId, clientData, orderData, items, onSuccess }: BinanceGatewayProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [binanceData, setBinanceData] = useState<{
    orderId: string;
    orderNumber: number;
    qrcodeLink: string;
    checkoutUrl: string;
    universalUrl: string;
  } | null>(null)

  const supabase = getSupabase()

  useEffect(() => {
    let mounted = true;
    
    const initBinancePayment = async () => {
      try {
        const res = await fetch('/api/checkout/binance/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId, clientData, orderData, items })
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Fallo al iniciar Binance Pay');
        }

        if (mounted) {
          setBinanceData({
            orderId: data.order_id,
            orderNumber: data.order_number,
            qrcodeLink: data.qrcodeLink,
            checkoutUrl: data.checkoutUrl,
            universalUrl: data.universalUrl
          });
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    initBinancePayment();
    return () => { mounted = false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escudo de Sincronización en Tiempo Real (Zero-Reload)
  useEffect(() => {
    if (!binanceData?.orderId) return;

    const channel = supabase.channel(`realtime:binance_order_${binanceData.orderId}`)
    .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `id=eq.${binanceData.orderId}` 
      }, (payload: any) => {
        if (payload.new.status === 'paid') {
          // El webhook ha confirmado el pago. Disparamos el éxito.
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 50, 30]);
          
          // Construimos un mensaje minimalista para WhatsApp (fallback)
          const fallbackWaLink = `https://wa.me/${storeId}?text=Hola,%20acabo%20de%20pagar%20mi%20pedido%20%23${binanceData.orderNumber}%20con%20Binance%20Pay.`;
          
          onSuccess(binanceData.orderNumber, fallbackWaLink, binanceData.orderId);
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [binanceData, supabase, onSuccess, storeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-[#FAFAFC] rounded-2xl border border-neutral-200/60">
        <Loader2 className="animate-spin text-neutral-400 mb-4" size={28} strokeWidth={1.5} />
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Conectando con Binance</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-red-200 gap-3">
        <AlertCircle className="text-red-500" size={28} strokeWidth={1.5} />
        <p className="text-xs font-semibold text-red-600 px-6 text-center">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-neutral-200/60 p-6 flex flex-col items-center shadow-sm"
    >
      <div className="flex items-center gap-2 mb-6">
        <Bitcoin className="text-[#FCD535]" size={24} strokeWidth={2} />
        <h3 className="font-semibold text-neutral-950 tracking-tight">Pagar con Binance Pay</h3>
      </div>

      <div className="bg-[#FAFAFC] p-4 rounded-xl border border-neutral-200/60 w-full flex flex-col items-center justify-center">
        {/* Usamos un iframe o la imagen del QR de Binance */}
        {binanceData?.qrcodeLink ? (
          <div className="relative bg-white p-2 rounded-lg border border-neutral-200 mb-4">
            <img src={binanceData.qrcodeLink} alt="Binance Pay QR" className="w-48 h-48 object-contain" />
          </div>
        ) : (
          <div className="w-48 h-48 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
            <QrCode className="text-neutral-300" size={48} strokeWidth={1} />
          </div>
        )}

        <p className="text-xs font-normal text-neutral-500 text-center mb-4 max-w-xs">
          Escanea el código QR con la app de Binance o usa el botón a continuación para pagar desde tu móvil.
        </p>

        <a 
          href={binanceData?.universalUrl || binanceData?.checkoutUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-[#FCD535] text-neutral-950 font-semibold text-xs py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all hover:bg-[#F0C92E] active:scale-[0.98]"
        >
          Abrir App de Binance <ExternalLink size={14} strokeWidth={2} />
        </a>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Loader2 className="animate-spin text-[#FCD535]" size={14} strokeWidth={2} />
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
          Esperando confirmación automática
        </span>
      </div>
    </motion.div>
  )
}