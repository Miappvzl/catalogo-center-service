'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, PlusSquare, Compass, ExternalLink, ArrowRight } from 'lucide-react';
import { PwaEnvironment } from '@/hooks/usePwaInstall';

interface PwaInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: PwaEnvironment;
}

export function PwaInstallGuideModal({
  isOpen,
  onClose,
  environment,
}: PwaInstallGuideModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 selection:bg-neutral-950 selection:text-white">
        {/* Backdrop suave */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/60 transition-opacity"
        />

        {/* Contenedor Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-neutral-200 shadow-2xl z-10 overflow-hidden flex flex-col p-6 space-y-5"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-semibold text-neutral-950 tracking-tight">
                Instalar Preziso en tu dispositivo
              </h3>
              <p className="text-[11px] text-neutral-400 font-normal mt-0.5">
                Acceso directo instantáneo en tu pantalla de inicio
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 bg-neutral-100 rounded-lg transition-colors"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          {/* CUERPO POLIMÓRFICO: Se adapta estrictamente al navegador detectado */}

          {/* 1. CASO: DENTRO DE WHATSAPP O INSTAGRAM */}
          {environment === 'in_app_webview' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed font-normal">
                Estás navegando dentro del visor interno de WhatsApp o Instagram. Por seguridad, las aplicaciones no pueden instalarse desde aquí.
              </div>

              <div className="space-y-2.5 text-xs text-neutral-700">
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-900">Toca el menú de opciones</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Presiona los tres puntos (<span className="font-bold">⋮</span>) o el icono de compartir en la esquina superior derecha.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <span className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-900">Abre en el navegador oficial</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Selecciona <span className="font-semibold text-neutral-800">&quot;Abrir en Chrome&quot;</span> o <span className="font-semibold text-neutral-800">&quot;Abrir en Safari&quot;</span> para instalar la app con 1 clic.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. CASO: IPHONE CON SAFARI */}
          {environment === 'ios_safari' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center shrink-0">
                  <Share size={15} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-950">
                    Paso 1: Toca el botón Compartir
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Se encuentra en la barra inferior central de tu navegador Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center shrink-0">
                  <PlusSquare size={15} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-950">
                    Paso 2: Agregar a inicio
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Desplaza el menú hacia abajo y presiona <span className="font-semibold text-neutral-900">&quot;Agregar a la pantalla de inicio&quot;</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. CASO: IPHONE CON CHROME */}
          {environment === 'ios_chrome' && (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center shrink-0">
                  <Share size={15} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-950">
                    Paso 1: Toca el menú de Chrome
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Presiona el icono de compartir en la barra de direcciones o el menú de tres puntos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center shrink-0">
                  <PlusSquare size={15} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-950">
                    Paso 2: Añadir a pantalla de inicio
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Selecciona <span className="font-semibold text-neutral-900">&quot;Añadir a pantalla de inicio&quot;</span> en la lista de opciones.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. CASO: OPERA Y OPERA GX EN ESCRITORIO */}
          {environment === 'opera_desktop' && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-neutral-100 rounded-xl border border-neutral-200/80 text-xs text-neutral-800 leading-relaxed">
                <strong className="text-neutral-950 font-semibold block mb-0.5">Limitación de Opera en PC:</strong>
                Opera y Opera GX no admiten la instalación de aplicaciones web en ventanas independientes.
              </div>

              <div className="space-y-2 text-xs text-neutral-700">
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <div className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">Recomendado: Usa Chrome o Edge</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Abre este enlace en Google Chrome o Microsoft Edge para instalar Preziso en tu ordenador con 1 solo clic.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <div className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">Alternativa en Opera: Acceso directo</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Arrastra el icono del candado (<span className="font-bold">🔒</span>) de la barra de direcciones directamente a tu escritorio de Windows o Mac.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. CASO DE RESPALDO (Navegadores de escritorio o Android donde el evento demoró) */}
          {(environment === 'native' || environment === 'desktop_safari' || environment === 'unsupported') && (
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 leading-relaxed">
              Para instalar la app en este navegador, abre el menú de opciones (<span className="font-bold">⋮</span> o <span className="font-bold">Archivo</span>) y selecciona <strong className="text-neutral-950">&quot;Instalar Preziso&quot;</strong> o <strong className="text-neutral-950">&quot;Añadir al Dock&quot;</strong>.
            </div>
          )}

          {/* Botón de cierre */}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
          >
            Entendido
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}