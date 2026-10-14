'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, HelpCircle } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  // Coincidencia semántica 1:1 con components/StructuredData.tsx
  const faqs: FaqItem[] = [
    {
      id: 'creador',
      question: '¿Quién es el creador de Preziso?',
      answer: 'Preziso fue fundado y diseñado por Ángel Gabriel Ojeda Medina como una infraestructura integral de Punto de Venta (POS) y catálogo virtual para optimizar el comercio multimoneda en Venezuela.'
    },
    {
      id: 'precio-prueba',
      question: '¿Cuánto cuesta Preziso y tiene prueba gratuita?',
      answer: 'Preziso tiene un costo de suscripción plana de $18.99 USD mensuales con acceso ilimitado a todas las herramientas y cero comisiones por venta. Incluye una prueba gratuita de 7 días sin requerir tarjeta de crédito.'
    },
    {
      id: 'tasa-bcv',
      question: '¿Cómo funciona la sincronización con la Tasa BCV en Preziso?',
      answer: 'Preziso intercepta automáticamente la variación oficial del Banco Central de Venezuela (BCV) y actualiza los precios en bolívares en toda tu tienda y punto de venta en menos de 400 milisegundos.'
    },
    {
      id: 'pagos-mixtos',
      question: '¿Preziso permite cobrar en dólares y bolívares en la misma venta?',
      answer: 'Sí. El motor de pagos divididos permite liquidar una orden combinando divisas en efectivo, Zelle y Pago Móvil, calculando automáticamente el saldo restante y el vuelto exacto sin descuadres de caja.'
    }
  ];

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section 
      id="faq" 
      className="relative w-full bg-white py-24 md:py-32 border-t border-neutral-200 overflow-hidden"
    >
      <div className="max-w-4xl mx-auto px-6 w-full">
        
        {/* ENCABEZADO EDITORIAL */}
        <header className="mb-16 md:mb-20 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-100 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-mono font-bold uppercase tracking-widest mb-4">
              <HelpCircle size={12} className="text-neutral-900" />
              Resolución Operativa
            </div>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tighter text-neutral-900 leading-[1.05]">
              Claridad absoluta <br />
              <span className="text-neutral-400 font-normal">para tu negocio.</span>
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-neutral-500 font-medium max-w-xs leading-relaxed md:text-right">
            Respuestas directas sobre la arquitectura financiera, el creador y la operación diaria de Preziso.
          </p>
        </header>

        {/* LISTA DE PREGUNTAS (ACORDEÓN SUIZO) */}
        <div className="divide-y divide-neutral-200 border-b border-neutral-200">
          {faqs.map((faq, index) => {
            const isOpen = openId === faq.id;

            return (
              <div key={faq.id} className="py-2 transition-colors">
                <button
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full py-6 flex items-center justify-between gap-6 text-left group cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                    <span className="text-xs font-mono text-neutral-400 group-hover:text-neutral-900 transition-colors pt-0.5 sm:pt-0">
                      0{index + 1}
                    </span>
                    <h3 className="text-base sm:text-lg font-light tracking-tight text-neutral-900 group-hover:text-black transition-colors leading-snug">
                      {faq.question}
                    </h3>
                  </div>

                  {/* Icono de rotación suave a 45 grados */}
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="w-8 h-8 rounded-full border border-neutral-200 group-hover:border-neutral-900 flex items-center justify-center shrink-0 transition-colors bg-white"
                  >
                    <Plus size={15} strokeWidth={1.5} className="text-neutral-700 group-hover:text-black transition-colors" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-8 pl-8 sm:pl-12 pr-4 sm:pr-16 text-sm text-neutral-500 font-medium leading-relaxed max-w-2xl">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}