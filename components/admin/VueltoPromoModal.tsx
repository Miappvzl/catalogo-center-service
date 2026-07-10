'use client';

import { useState } from 'react';
import { toggleStoreCreditStatus } from '@/app/admin/orders/action';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Check, ShieldCheck, X, Loader2, Sparkles, HelpCircle, MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';

interface VueltoPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  onSuccess: () => void;
}

export default function VueltoPromoModal({ isOpen, onClose, storeId, onSuccess }: VueltoPromoModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async () => {
    setIsProcessing(true);
    const result = await toggleStoreCreditStatus(storeId, true);
    setIsProcessing(false);

    if (result.success) {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success', title: '¡Vuelto Inteligente Activado!',
        showConfirmButton: false, timer: 2000, customClass: { popup: 'rounded-xl bg-black text-white' }
      });
      onSuccess();
      onClose();
    } else {
      Swal.fire({ icon: 'error', title: 'Error al activar', text: result.error, confirmButtonColor: '#000' });
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-white/60 backdrop-blur-md">
      <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />
      
      <div className="relative bg-white w-full max-w-xl rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 flex flex-col gap-6 border border-gray-100/55 max-h-[90vh] overflow-y-auto no-scrollbar">
        
        {/* HEADER PROMOCIONAL */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-black text-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
              <Gift size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#000] bg-[#000]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Sparkles size={10} /> Premium Feature
                </span>
              </div>
              <h2 className="text-xl font-black text-black tracking-tight mt-1">Activar Vuelto Inteligente</h2>
            </div>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-black">
            <X size={20} />
          </button>
        </div>

        {/* BENEFICIOS OPERATIVOS */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            Resuelve el problema de la falta de menudo en efectivo de forma digital. Convierte la escasez de billetes en tu mejor herramienta de retención de clientes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col gap-2">
              <span className="text-xs font-black text-black uppercase tracking-wide">Para tus clientes:</span>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                Reciben su vuelto exacto al instante en su Preziso Passport, listo para ser canjeado en su próxima compra en tu tienda.
              </p>
            </div>
            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col gap-2">
              <span className="text-xs font-black text-black uppercase tracking-wide">Para tu negocio:</span>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                Incrementa la recompra de tus clientes (LTV), agiliza la entrega de tus motorizados y cuadra la caja al centavo.
              </p>
            </div>
          </div>
        </div>

        {/* BLINDAJE LEGAL EN VENEZUELA (MARCO JURÍDICO) */}
        <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100/50 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Blindaje Legal en Venezuela</span>
          </div>
          <div className="text-[11px] text-emerald-800 leading-relaxed space-y-2 font-medium">
            <p>
              <strong>1. No es intermediación financiera (SUDEBAN):</strong> Este sistema opera en circuito cerrado. El saldo no es retirable en efectivo, no genera intereses y no puede transferirse a otros usuarios ni a otras tiendas de Preziso. Legalmente califica como un <em>pago anticipado de mercancía</em> o <em>nota de crédito comercial</em>.
            </p>
            <p>
              <strong>2. Consentimiento explícito (SUNDDE):</strong> El checkout incluye una casilla de verificación (*Opt-In*). El vuelto virtual nunca se impone de forma obligatoria, cumpliendo estrictamente con la Ley Orgánica de Precios Justos sobre el derecho del consumidor a recibir vuelto en efectivo si lo exige.
            </p>
          </div>
        </div>

        {/* 🚀 BLOQUE DE ASESORÍA LOGÍSTICA/LEGAL EN WHATSAPP */}
        <div className="flex flex-col items-center gap-1.5 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-semibold leading-none">
              ¿Quieres entender mejor esta función antes de aceptar?
            </p>
            <a
              href="https://wa.me/584145811936?text=Hola%20equipo%20Preziso,%20me%20gustaria%20entender%20mejor%20como%20funciona%20el%20Vuelto%20Inteligente%20antes%20de%20activarlo%20en%20mi%20tienda."
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black text-[#000] hover:underline underline-offset-4 flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle size={14} className="fill-current" /> Hablar con el equipo
            </a>
        </div>

        {/* FOOTER ACCIÓN */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            type="button" onClick={onClose} disabled={isProcessing}
            className="flex-1 bg-gray-50 text-gray-700 font-bold uppercase tracking-widest text-[10px] py-4 rounded-[20px] hover:bg-gray-100 transition-all"
          >
            Quizás más tarde
          </button>
          <button 
            type="button" onClick={handleActivate} disabled={isProcessing}
            className="flex-1 bg-black text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} 
            Aceptar y Activar
          </button>
        </div>

      </div>
    </div>
  );
}