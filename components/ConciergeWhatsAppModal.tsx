'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, MessageSquare } from 'lucide-react';

interface ConciergeProps {
  whatsappNumber?: string;
}

export default function ConciergeWhatsAppModal({ whatsappNumber = "584120000000" }: ConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Sensor de visibilidad: Aparece suavemente al superar los 350px de scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bloqueo de scroll de fondo cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const options = [
    {
      index: '01',
      title: 'Tengo mis productos en Excel o cuadernos',
      desc: '¿Cómo me ayudan a pasar mi inventario a Preziso sin hacerlo a mano?',
      prefilledText: 'Hola equipo de Preziso. Actualmente llevo mis productos en Excel y cuadernos. Quisiera saber cómo es el proceso para que me ayuden a cargarlos al sistema.'
    },
    {
      index: '02',
      title: 'Quiero saber si funciona para mi tipo de negocio',
      desc: 'Ropa, repuestos, comida, farmacia o ventas al mayor.',
      prefilledText: 'Hola. Mi negocio es de [escribe aquí tu rubro] y quiero confirmar si el sistema se adapta bien a mi forma de vender.'
    },
    {
      index: '03',
      title: 'Dudas con el cobro en dólares y bolívares',
      desc: 'Cómo manejar pagos combinados (Zelle, efectivo y pago móvil).',
      prefilledText: 'Hola, tengo dudas de cómo cuadra la caja cuando un cliente me paga una parte en dólares y otra en bolívares por pago móvil a tasa oficial.'
    },
    {
      index: '04',
      title: 'Probar la plataforma durante una semana',
      desc: 'Quiero activar los 7 días de prueba y ver cómo funciona.',
      prefilledText: 'Hola, me gustaría activar la prueba gratuita de 7 días y que me guíen en los primeros pasos para abrir mi tienda.'
    }
  ];

  const handleSelectOption = (text: string) => {
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* ================= 1. DISPARADOR ADAPTATIVO (0 LAG) ================= */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90]">
        
        {/* Móvil: Micro-módulo táctil ergonómico */}
        <div className="block sm:hidden">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir consultas"
            className="w-12 h-12 rounded-full bg-[#0c0d10] text-white border border-neutral-800 flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.5)] active:scale-90 transition-transform cursor-pointer"
          >
            <MessageSquare size={18} strokeWidth={1.8} className="text-neutral-200" />
          </button>
        </div>

        {/* Desktop: Placa arquitectónica */}
        <div className="hidden sm:block">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Consultas comerciales"
            className="group flex items-center gap-3 bg-[#0a0a0c] text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2.5 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <span className="text-[10px] font-mono tracking-[0.15em] text-neutral-400 group-hover:text-neutral-200 transition-colors uppercase">
              Consultas
            </span>

            <div className="w-px h-3 bg-neutral-800 group-hover:bg-neutral-700 transition-colors" />

            <span className="text-xs font-light tracking-tight text-white flex items-center gap-1.5">
              Hablar con nosotros
              <ArrowUpRight size={13} className="text-neutral-500 group-hover:text-white transition-colors" />
            </span>
          </button>
        </div>
      </div>

      {/* ================= 2. DESPLEGABLE CINEMATOGRÁFICO DE 60 FPS ================= */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-end sm:justify-end sm:p-6">
            
            {/* Backdrop: Opacidad pura en GPU (Cero filtros de blur que traben el procesador) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/75 will-change-opacity"
            />

            {/* Panel Principal: Animación fluida con curva de aceleración hardware */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full sm:w-[440px] bg-[#0c0d10] border-t sm:border border-neutral-800 rounded-t-[2.5rem] sm:rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden z-10 max-h-[90vh] flex flex-col will-change-transform transform-gpu"
            >
              {/* Barra táctil de agarre (Solo móvil) */}
              <div className="sm:hidden w-full pt-3 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-neutral-800 rounded-full" />
              </div>

              {/* CABECERA CON ESCULTURA 3D SOBREDIMENSIONADA */}
              <div className="p-6 sm:p-7 pb-5 border-b border-neutral-800/80 relative flex items-center justify-between gap-4 overflow-hidden">
                
                {/* Resplandor ambiental oscuro de fondo */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/[0.04] rounded-full blur-3xl pointer-events-none" />

                {/* Textos Editoriales */}
                <div className="flex-1 min-w-0 pr-1 z-10">
                  <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-neutral-500 block mb-1.5">
                    Atención Directa
                  </span>
                  <h3 className="text-lg sm:text-xl font-light tracking-tight text-white leading-tight">
                    Preguntas antes de comenzar.
                  </h3>
                  <p className="text-xs text-neutral-400 font-light mt-1.5 leading-relaxed">
                    Selecciona tu duda y te respondemos por WhatsApp casi de inmediato.
                  </p>
                </div>

                {/* Escultura 3D Gigante con levitación por hardware */}
                <div className="relative shrink-0 flex items-center justify-center z-10 pr-6 sm:pr-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 relative select-none pointer-events-none gpu-levitation">
                    <img
                      src="/Ícono-WhatsApp-vidrio-cromo.webp"
                      alt="WhatsApp Escultórico Preziso"
                      className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>

                {/* Botón de Cierre Minimalista */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-neutral-900 z-20"
                  aria-label="Cerrar ventana"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>

              {/* LISTA NUMERADA SUIZA */}
              <div className="divide-y divide-neutral-900 overflow-y-auto no-scrollbar">
                {options.map((item) => (
                  <button
                    key={item.index}
                    onClick={() => handleSelectOption(item.prefilledText)}
                    className="w-full text-left p-4 sm:p-5 hover:bg-neutral-900/50 active:bg-neutral-900 transition-colors group flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="text-xs font-mono text-neutral-600 group-hover:text-neutral-400 transition-colors pt-0.5 shrink-0">
                        {item.index}
                      </span>

                      <div>
                        <h4 className="text-xs sm:text-sm font-normal text-white group-hover:text-white transition-colors leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-light mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight 
                      size={14} 
                      className="text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" 
                    />
                  </button>
                ))}
              </div>

              {/* PIE DE TARJETA */}
              <div className="px-5 sm:px-6 py-3.5 bg-[#08090b] border-t border-neutral-900 flex items-center justify-between mt-auto">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                  Canal Oficial Preziso
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  Respuesta humana
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ESTILOS DE COMPOSICIÓN GPU DIRECTA (Cero lag en Alcatel o iPhone antiguo) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gpuLevitationKeyframe {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -5px, 0); }
        }
        .gpu-levitation {
          animation: gpuLevitationKeyframe 4.5s ease-in-out infinite;
          will-change: transform;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }
      `}} />
    </>
  );
}