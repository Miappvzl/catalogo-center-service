'use client';

import { useState, useEffect } from 'react';
import { issueStoreCredit } from '@/app/admin/orders/action';
import { Loader2, DollarSign, Wallet, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

interface IssueVirtualChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  storeId: string;
  existingCustomerId?: string | null;
  orderNumber: number;
  defaultAmount?: number; // 🚀 Propiedades agregadas para pre-completado
  onSuccess: () => void;  // 🚀 Callback para actualizar el estado del padre al instante
}

export default function IssueVirtualChangeModal({
  isOpen,
  onClose,
  orderId,
  storeId,
  existingCustomerId,
  orderNumber,
  defaultAmount = 0,
  onSuccess,
}: IssueVirtualChangeModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sincronizar el pre-completado cuando el modal se monta o cambia el valor propuesto
  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount > 0 ? defaultAmount.toFixed(2) : '');
      setNote(`Vuelto de orden #${orderNumber}`);
      setJustification('');
      setEmail('');
    }
  }, [isOpen, defaultAmount, orderNumber]);

  if (!isOpen) return null;

  const parsedAmount = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const parsedDefault = Math.round(defaultAmount * 100) / 100;
  
  // 🚀 Control de desviación estricta
  const isDeviated = defaultAmount > 0 && Math.abs(parsedAmount - parsedDefault) > 0.01;
  const isJustificationValid = !isDeviated || justification.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Swal.fire({ icon: 'error', title: 'Monto inválido' });
      setIsProcessing(false);
      return;
    }

    // Si hay desviación, anexamos la justificación a la nota oficial para la auditoría de caja
    const finalNote = isDeviated 
      ? `${note} | [Ajuste de Auditoría: ${justification.trim()}]`
      : note;

    const result = await issueStoreCredit({
      orderId,
      storeId,
      amount: parsedAmount,
      note: finalNote,
      email: email,
      existingCustomerId
    });

    setIsProcessing(false);

    if (result.success) {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success', title: 'Vuelto otorgado exitosamente', 
        showConfirmButton: false, timer: 2000, customClass: { popup: 'rounded-xl bg-black text-white' }
      });
      onSuccess();
      onClose();
    } else {
      Swal.fire({ icon: 'error', title: 'Error contable', text: result.error, confirmButtonColor: '#000' });
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-white/60 backdrop-blur-md">
      <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />
      
      <div className="relative bg-white w-full max-w-md rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col gap-6 border border-gray-100/55">
        <div>
          <h2 className="text-xl font-black text-black tracking-tight">Otorgar Vuelto Virtual</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Asigna crédito de tienda a favor del cliente para sus próximas compras.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!existingCustomerId && (
            <div className="bg-amber-50/40 rounded-2xl p-5 border border-amber-100/50">
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1.5">Cliente Invitado</p>
              <p className="text-xs text-amber-700 leading-relaxed mb-3">Para otorgar saldo a un pedido invitado, ingresa el correo del cliente para crear o vincular su cuenta.</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@cliente.com"
                className="w-full bg-white text-black text-sm font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-amber-200/50"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Monto a otorgar (USD)</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-gray-400"><DollarSign size={16} /></span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 text-black text-lg font-black rounded-xl py-3 pl-10 pr-4 outline-none border border-transparent focus:border-gray-300 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
              />
            </div>
          </div>

          {/* 🚀 EXPANSOR DE JUSTIFICACIÓN SI EXISTE DESVIACIÓN (COMPLIANCE) */}
          {isDeviated && (
            <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-100/50 flex flex-col gap-3 animate-in slide-in-from-top-3">
              <div className="flex gap-2 text-rose-800">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest">Alerta de Desviación</span>
                  <span className="text-xs font-medium">El monto sugerido por el sistema es de <strong>${defaultAmount.toFixed(2)}</strong>. Explica por qué estás alterando el monto:</span>
                </div>
              </div>
              <textarea
                required
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Escribe la justificación aquí (mínimo 10 caracteres)..."
                className="w-full bg-white text-xs font-medium p-3 rounded-xl outline-none focus:border-rose-400 transition-colors border border-rose-200/50 placeholder:text-gray-400 text-rose-950"
              />
              <span className="text-[9px] font-bold uppercase tracking-widest text-rose-600 self-end">
                {justification.trim().length}/10 caracteres mínimo
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Concepto / Nota</label>
            <input
              type="text"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Vuelto por diferencia en efectivo"
              className="w-full bg-gray-50 text-black text-sm font-medium rounded-xl py-3 px-4 outline-none border border-transparent focus:border-gray-300 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 bg-gray-100 text-gray-700 font-bold uppercase tracking-widest text-[10px] py-4 rounded-[20px] hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || !isJustificationValid}
              className="flex-1 bg-black text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />} 
              Emitir Crédito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}