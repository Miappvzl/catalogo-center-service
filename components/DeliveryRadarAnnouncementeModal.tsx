'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  Compass, 
  ShieldCheck, 
  Zap,
  Check,
  MapPin
} from 'lucide-react';

interface DeliveryRadarAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateRadar: () => void;
}

export const DeliveryRadarAnnouncementModal: React.FC<DeliveryRadarAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onActivateRadar,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 antialiased">
      {/* Backdrop con desenfoque de fondo */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200" 
        onClick={onClose} 
      />

      {/* Contenedor Proporcionado (Estilo Linear / Apple) */}
      <div className="relative w-full max-w-[490px] bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-6 sm:p-7 space-y-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera Monocromática */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shrink-0 shadow-sm">
              <Compass size={20} strokeWidth={2} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold block">
                NUEVA HERRAMIENTA
              </span>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                Radar de Delivery Inteligente
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Descripción Estratégica */}
        <p className="text-xs text-zinc-400 leading-relaxed">
          Sustituye las tarifas fijas manuales por un motor de cálculo satelital que cobra exactamente por la distancia de ruta recorrida por el repartidor.
        </p>

        {/* Pilares de Valor (Filas Limpias en Paleta Neutra) */}
        <div className="space-y-2.5">
          
          <div className="flex items-start gap-3 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
            <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 shrink-0 mt-0.5">
              <Zap size={14} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-100">Cero Pérdidas en Carreras</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                El precio se ajusta de forma matemática según los kilómetros reales entre tu cocina y la puerta del cliente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
            <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 shrink-0 mt-0.5">
              <MapPin size={14} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-100">Búsqueda de Google en Checkout</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                Tus compradores encuentran su edificio, urbanización o avenida con el motor oficial de Google Maps.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
            <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 shrink-0 mt-0.5">
              <ShieldCheck size={14} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-100">Protección de Cobertura Máxima</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                Bloquea automáticamente pedidos fuera de tu rango para que ningún motorizado haga viajes que no sean rentables.
              </p>
            </div>
          </div>

        </div>

        {/* Nota Discreta de Compatibilidad */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-medium">
          <Check size={12} className="text-zinc-400" />
          <span>Tus tarifas manuales anteriores se conservan intactas.</span>
        </div>

        {/* Botones de Acción (Obsidiana / Titanio) */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onActivateRadar();
              onClose();
            }}
            className="w-full sm:flex-1 bg-white hover:bg-zinc-200 text-zinc-950 active:scale-[0.98] py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span>Activar Radar</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Mantener Lista
          </button>
        </div>

      </div>
    </div>
  );
};