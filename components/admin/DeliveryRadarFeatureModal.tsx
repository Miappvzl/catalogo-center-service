'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  X, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  Zap,
  Check
} from 'lucide-react';

interface DeliveryRadarFeatureModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const DeliveryRadarFeatureModal: React.FC<DeliveryRadarFeatureModalProps> = ({
  forceOpen,
  onClose,
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const STORAGE_KEY = 'pz_radar_feature_announced_v1';

  useEffect(() => {
    setMounted(true);
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
      return;
    }

    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  // 🚀 BLOQUEO ESTRICTO DEL BODY: Oculta automáticamente Header y Bottom Bar
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleGoToSettings = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    if (onClose) onClose();
    router.push('/admin/settings');
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3.5 sm:p-4 antialiased">
      {/* Backdrop oscuro translúcido */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={handleDismiss}
      />

      {/* Contenedor Compacto Mobile-First (Altura máxima contenida de ~410px) */}
      <div className="relative w-full max-w-[420px] bg-white text-zinc-950 border border-zinc-200/90 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] p-5 sm:p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto no-scrollbar">
        
        {/* Cabecera Compacta */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
              Nueva Función
            </span>

            <h3 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight leading-snug">
              Radar de Delivery con Google Maps
            </h3>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Subtítulo Conciso */}
        <p className="text-xs text-zinc-500 leading-relaxed font-normal">
          Automatiza las tarifas de entrega por distancia satelital y elimina pérdidas por carreras mal cobradas.
        </p>

        {/* Filas de Beneficios Compactas */}
        <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3 space-y-2.5">
          
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-white border border-zinc-200 text-zinc-900 shrink-0 mt-0.5">
              <Zap size={13} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 leading-tight">Tarifas por Kilómetro</h4>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                Cobra según la distancia real entre tu sede y el cliente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-white border border-zinc-200 text-zinc-900 shrink-0 mt-0.5">
              <MapPin size={13} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 leading-tight">Buscador Oficial Google</h4>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                Tus clientes ubican su edificio o urbanización en segundos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-white border border-zinc-200 text-zinc-900 shrink-0 mt-0.5">
              <ShieldCheck size={13} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 leading-tight">Límite de Cobertura</h4>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                Bloquea pedidos que excedan tu rango máximo de despacho.
              </p>
            </div>
          </div>

        </div>

        {/* Nota Discreta */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-medium">
          <Check size={11} className="text-zinc-600" />
          <span>Tus tarifas manuales anteriores siguen guardadas.</span>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleGoToSettings}
            className="w-full sm:flex-1 bg-zinc-950 hover:bg-black active:scale-[0.98] text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span>Configurar mi Radar</span>
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-zinc-900 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors text-center"
          >
            Más Tarde
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};