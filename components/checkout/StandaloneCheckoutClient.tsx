'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, MessageCircle, ArrowUpRight, Check, AlertCircle, ChevronDown, ShoppingBag } from 'lucide-react';
import CheckoutProcess from '@/components/CheckoutProcess';
import { calculateCartEngine } from '@/utils/cartLogic';

interface StandaloneCheckoutClientProps {
  store: any;
  link: {
    id: string;
    total_amount_usd: number;
    title: string;
    mode: 'catalog' | 'custom_amount';
    items: any[];
    allow_split_payments: boolean;
    min_split_amount_usd: number;
  };
  rates: { usd: number; eur: number };
}

export default function StandaloneCheckoutClient({
  store,
  link,
  rates,
}: StandaloneCheckoutClientProps) {
  const [orderSuccess, setOrderSuccess] = useState<{
    
    orderNumber: number;
    whatsappUrl: string;
    orderId: string;
  } | null>(null);

   const [showItemsAccordion, setShowItemsAccordion] = useState(false);
  

  // 1. Puente de Variables CSS para blindar el tema visual de CheckoutProcess
  const themeColors = store.theme_config?.colors || {};
  const themeVariables = {
    '--store-background': '#F8F9FA',
    '--store-surface': '#FFFFFF',
    '--store-border': themeColors.border || '#E4E4E7',
    '--store-text-main': themeColors.text_main || '#000000',
    '--store-surface-text': themeColors.surface_text || '#71717A',
    '--store-primary': themeColors.primary || '#000000',
    '--store-primary-text': themeColors.primary_text || '#FFFFFF',
    '--store-incentive': themeColors.incentive || '#059669',
    '--radius-btn': '0.75rem',
    '--radius-card': '1rem',
    '--border-width-ui': '1px',
    '--shadow-ui': 'none',
    fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
  } as React.CSSProperties;

  // 2. Adaptador del Snapshot: Reconstruye los items del enlace en CartItems compatibles
   // 2. Adaptador del Snapshot: Reconstruye los items con penalty y precios en divisa
  const overrideItems = useMemo(() => {
    if (!Array.isArray(link.items) || link.items.length === 0) {
      return [
        {
          id: `quick-custom-${link.id}`,
          productId: '0',
          variantId: null,
          name: link.title || 'Cobro directo',
          price: Number(link.total_amount_usd),
          basePrice: Number(link.total_amount_usd),
          penalty: 0,
          image: store.logo_url || '',
          quantity: 1,
          variantInfo: null,
          requiresShipping: false,
          isTaxExempt: true,
        },
      ];
    }

    return link.items.map((item: any, idx: number) => {
      const baseCashPrice = Number(item.basePrice !== undefined ? item.basePrice : item.price);
      const penalty = Number(item.penalty || 0);
      const listPrice = Number(item.price || (baseCashPrice + penalty));

      return {
        id: `quick-item-${idx}-${item.productId || 'custom'}`,
        productId: String(item.productId || 0),
        variantId: item.variantId || null,
        name: item.name,
        price: listPrice,
        basePrice: baseCashPrice,
        penalty: penalty,
        image: item.image || item.imageUrl || store.logo_url || '',
        quantity: Number(item.quantity || 1),
        variantInfo: item.variantInfo || item.variantLabel || null,
        requiresShipping: item.requiresShipping !== false,
        isTaxExempt: item.isTaxExempt ?? true,
        productWholesaleActive: Boolean(item.productWholesaleActive),
        productWholesaleMinQty: Number(item.productWholesaleMinQty || 6),
        productWholesaleDiscountPct: Number(item.productWholesaleDiscountPct || 0),
      };
    });
  }, [link, store.logo_url]);

  // 3. Ejecución del motor financiero cartLogic con soporte de mayorista y divisas
  const isStrictTax = store.fiscal_profile === 'ordinary' || store.fiscal_profile === 'special';
  const wholesaleConfig = store.wholesale_config || { active: false, min_items: 6, discount_percentage: 0 };

  const cartEngine = useMemo(() => {
    return calculateCartEngine(overrideItems, [], isStrictTax, wholesaleConfig);
  }, [overrideItems, isStrictTax, wholesaleConfig]);

  return (
    <div
      style={themeVariables}
      className="min-h-screen w-full bg-[#F8F9FA] flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 antialiased selection:bg-neutral-950 selection:text-white"
    >
      {/* Contenedor Tarjeta Standalone Centrado */}
      <div className="w-full max-w-lg bg-white rounded-2xl border border-neutral-200/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col my-auto">
        
        {/* Cabecera Editorial del Comercio */}
        <header className="px-5 py-4 border-b border-neutral-150 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-8 h-8 rounded-lg object-cover border border-neutral-200/80 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-800 text-xs font-semibold shrink-0">
                {store.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-neutral-950 truncate leading-none">
                {store.name}
              </h1>
              <p className="text-[11px] text-neutral-400 font-normal mt-1 leading-none">
                {link.title || 'Liquidación de Cobro'}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[10px] font-medium shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Cobro Verificado</span>
          </div>
        </header>

          {/* Acordeón Editorial: Detalle de Productos en la Orden */}
        {overrideItems.length > 0 && (
          <div className="border-b border-neutral-150 bg-neutral-50/60">
            <button
              type="button"
              onClick={() => setShowItemsAccordion(!showItemsAccordion)}
              className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-medium text-neutral-700 hover:text-neutral-950 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5] text-neutral-500" />
                <span>
                  Ver productos del pedido ({overrideItems.reduce((acc: number, i: any) => acc + i.quantity, 0)} artículos)
                </span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 stroke-[1.5] text-neutral-400 transition-transform duration-200 ${
                  showItemsAccordion ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {showItemsAccordion && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-5 pb-3.5 space-y-2 border-t border-neutral-150/70"
                >
                  {overrideItems.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="flex items-center justify-between text-xs pt-1.5">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-cover border border-neutral-200/80 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-neutral-200/80 flex items-center justify-center text-[10px] font-semibold text-neutral-600 shrink-0">
                            {item.quantity}x
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-neutral-900 font-medium truncate leading-tight">
                            {item.quantity}x {item.name}
                          </p>
                          {item.variantInfo && (
                            <p className="text-[10px] text-neutral-400 font-mono truncate">{item.variantInfo}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-neutral-950 shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}


        {/* Cuerpo Dinámico: Éxito vs Checkout Activo */}
        <div className="flex-1 w-full flex flex-col min-h-[580px] max-h-[85vh] overflow-hidden">
          <AnimatePresence mode="wait">
            {orderSuccess ? (
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center space-y-6 overflow-y-auto"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <Check className="w-7 h-7 stroke-[2]" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold text-neutral-950 tracking-tight">
                    ¡Pago Registrado!
                  </h2>
                  <p className="text-xs text-neutral-500 font-normal max-w-xs mx-auto leading-relaxed">
                    Tu pedido <strong className="text-neutral-900 font-semibold">#{orderSuccess.orderNumber}</strong> ha sido reservado y enviado a {store.name}.
                  </p>
                </div>

                <div className="w-full bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 text-left space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 font-normal">Número de Pedido</span>
                    <span className="font-semibold text-neutral-950">#{orderSuccess.orderNumber}</span>
                  </div>
                    <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 font-normal">Total Liquidado</span>
                    <span className="font-semibold text-neutral-950">
                      ${((orderSuccess as any)?.finalPaidAmount ?? link.total_amount_usd).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <a
                  href={orderSuccess.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-neutral-950 hover:bg-neutral-850 active:scale-98 text-white rounded-xl text-xs font-medium transition-all shadow-xs"
                >
                  <MessageCircle className="w-4 h-4 stroke-[1.5]" />
                  <span>Enviar Comprobante por WhatsApp</span>
                </a>
              </motion.div>
            ) : (
              <CheckoutProcess
                storeId={store.id}
                storeConfig={store}
                currency="usd"
                rates={rates}
                phone={store.phone || ''}
                cartEngine={cartEngine}
                wholesaleDiscountList={cartEngine.wholesaleDiscountList}
                wholesaleDiscountCash={cartEngine.wholesaleDiscountCash}
                isQuickLinkMode={true}
                quickLinkId={link.id}
                overrideItems={overrideItems}
                 onSuccess={(orderNumber, waUrl, orderId) => {
                  let finalPaidAmount = Number(link.total_amount_usd);

                  // 🚀 Extracción infalible del total real con descuentos y delivery
                  try {
                    const decoded = decodeURIComponent(waUrl);
                    const match = decoded.match(/TOTAL FINAL APLICADO:\s*\$([0-9.]+)/i) 
                               || decoded.match(/TOTAL FINAL\*,\s*\*?\$([0-9.]+)/i);
                    if (match && match[1]) {
                      finalPaidAmount = parseFloat(match[1]);
                    }
                  } catch {
                    // Fallback al monto base del link si falla el parseo
                  }

                  setOrderSuccess({
                    orderNumber,
                    whatsappUrl: waUrl,
                    orderId,
                    finalPaidAmount,
                  } as any);
                }}
                onBack={() => {}}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer Editorial con Sello de Confianza Preziso */}
        <footer className="px-5 py-3 border-t border-neutral-150 bg-neutral-50/60 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
          <span>Transacción cifrada punto a punto</span>
          <a
            href="https://preziso.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <span>Preziso</span>
            <ArrowUpRight className="w-3 h-3 stroke-[1.5]" />
          </a>
        </footer>
      </div>
    </div>
  );
}
