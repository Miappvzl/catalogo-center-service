'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Copy,
  Upload,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Loader2,
  Share2,
  ExternalLink,
  X,
  CreditCard,
  Building2,
  Phone,
  Hash,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase-client';
import { compressImage } from '@/utils/imageOptimizer';
import { submitQuickPayment, SubmitQuickPaymentResponse } from '@/app/actions/submit-quick-payment';

interface QuickPayClientProps {
  link: {
    id: string;
    total_amount_usd: number;
    paid_amount_usd: number;
    title: string;
    mode: 'catalog' | 'custom_amount';
    items: any[];
    allow_split_payments: boolean;
    min_split_amount_usd: number;
    expires_at: string | null;
  };
  store: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    phone: string | null;
    payment_config: any;
    currency_type: string;
  };
  bcvRate: number;
}

// Estructura de cada campo bancario identificado
interface ParsedBankItem {
  label: string | null;
  value: string;
  textToCopy: string;
}

export default function QuickPayClient({ link, store, bcvRate }: QuickPayClientProps) {
  const supabase = getSupabase();
  const [isPending, startTransition] = useTransition();

  // Estados del Comprador
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('Pago Móvil');

  // Estados de Abonos / Pagos Parciales
  const totalDueUsd = link.total_amount_usd - (link.paid_amount_usd || 0);
  const [customPayAmount, setCustomPayAmount] = useState<string>(totalDueUsd.toFixed(2));
  const [isSplitMode, setIsSplitMode] = useState(false);

  // Estados de Comprobante / Upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Estados de UI y Retroalimentación
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<SubmitQuickPaymentResponse | null>(null);
  const [showItemsAccordion, setShowItemsAccordion] = useState(false);

  // Métodos de pago activos configurados en la tienda
  const payments = store.payment_config || {};
  const activeMethods = useMemo(() => {
    const list: string[] = [];
    if (payments.pago_movil?.active) list.push('Pago Móvil');
    if (payments.zelle?.active) list.push('Zelle');
    if (payments.binance?.active) list.push('Binance');
    if (payments.transferencia?.active) list.push('Transferencia');
    if (payments.cash?.active) list.push('Efectivo');
    // Fallback si no tiene métodos configurados
    return list.length > 0 ? list : ['Pago Móvil'];
  }, [payments]);

  // Selección automática del primer método activo si el actual no existe
  useMemo(() => {
    if (!activeMethods.includes(selectedMethod) && activeMethods.length > 0) {
      setSelectedMethod(activeMethods[0]);
    }
  }, [activeMethods, selectedMethod]);

  // Cálculo de montos en USD y Bolívares
  const currentPayUsd = Number(parseFloat(customPayAmount) || totalDueUsd);
  const currentPayBs = currentPayUsd * (bcvRate || 1);

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatBs = (val: number) => {
    return `Bs ${val.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Copiado al Portapapeles con feedback temporal
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Adjuntar y validar comprobante de pago
  const handleReceiptChange = (file: File | null) => {
    if (!file) {
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Solo se permiten imágenes (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('La imagen no debe superar los 8MB.');
      return;
    }

    setErrorMessage(null);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  // Parser inteligente de detalles bancarios (Extrae datos clave para copiado en 1 clic)
  const parsedBankDetails = useMemo(() => {
    let rawText = '';
    if (selectedMethod === 'Pago Móvil') rawText = payments.pago_movil?.details || '';
    else if (selectedMethod === 'Zelle') rawText = payments.zelle?.details || '';
    else if (selectedMethod === 'Binance') rawText = payments.binance?.details || '';
    else if (selectedMethod === 'Transferencia') rawText = payments.transferencia?.details || '';
    else if (selectedMethod === 'Efectivo') rawText = payments.cash?.details || 'Pago en efectivo acordado con el comercio.';

    if (!rawText.trim()) return [];

    const lines = rawText.includes('\n') ? rawText.split('\n') : rawText.split(/[,;|]/);

    return lines
      .map((l: string) => l.trim())
      .filter(Boolean)
      .map((item: string): ParsedBankItem => {
        const hasColon = item.includes(':');
        let label = hasColon ? item.split(':')[0].trim() : null;
        let value = hasColon ? item.split(':').slice(1).join(':').trim() : item;

        if (!label) {
          const clean = value.replace(/[\s-]/g, '');
          if (selectedMethod === 'Binance') {
            if (/^\d{6,12}$/.test(clean)) label = 'Binance Pay ID';
            else if (/@/.test(value)) label = 'Correo Binance';
            else label = 'ID Binance';
          } else if (selectedMethod === 'Zelle') {
            if (/@/.test(value)) label = 'Correo Zelle';
            else if (/^\+?\d{10,15}$/.test(clean)) label = 'Teléfono Zelle';
            else label = 'Titular Zelle';
          } else {
            if (/^(0412|0414|0424|0416|0426|\+58)\d+/.test(clean)) label = 'Teléfono Pago Móvil';
            else if (/^(V|E|J|G|P)?-?\d{6,9}$/i.test(clean)) label = 'Cédula / RIF';
            else if (/^\d{20}$/.test(clean)) label = 'Número de Cuenta';
            else if (/banco|venezuela|banesco|mercantil|provincial|bnc|bancaribe|plaza|bancamiga/i.test(value)) label = 'Banco';
          }
        }

        return { label, value: value || item, textToCopy: value || item };
      });
  }, [selectedMethod, payments]);

  // Texto consolidado para "Copiar Todo"
  const copyAllText = useMemo(() => {
    const isHard = selectedMethod === 'Zelle' || selectedMethod === 'Binance' || selectedMethod === 'Efectivo';
    const amountStr = isHard ? formatUSD(currentPayUsd) : formatBs(currentPayBs);

    const lines = [
      `Monto a transferir: ${amountStr}`,
      ...parsedBankDetails.map((i) => (i.label ? `${i.label}: ${i.value}` : i.value)),
    ];
    return lines.join('\n');
  }, [currentPayUsd, currentPayBs, selectedMethod, parsedBankDetails]);

  // Manejador del Envío del Pago
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Por favor completa tu nombre y número de teléfono.');
      return;
    }

    if (currentPayUsd <= 0) {
      setErrorMessage('El monto a cancelar debe ser mayor a cero.');
      return;
    }

    if (link.allow_split_payments && isSplitMode) {
      const minSplit = Number(link.min_split_amount_usd || 0);
      if (currentPayUsd < minSplit) {
        setErrorMessage(`El monto mínimo permitido para reservar es de ${formatUSD(minSplit)}.`);
        return;
      }
      if (currentPayUsd > totalDueUsd) {
        setErrorMessage(`El monto no puede superar el total pendiente de ${formatUSD(totalDueUsd)}.`);
        return;
      }
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        let uploadedReceiptUrl: string | undefined = undefined;

        // Subida y compresión segura del comprobante a Supabase Storage
        if (receiptFile) {
          setIsUploadingReceipt(true);
          const compressed = await compressImage(receiptFile, 1200, 0.75);
          const fileExt = receiptFile.name.split('.').pop() || 'jpg';
          const fileName = `quick-pay-${link.id}-${Date.now().toString().slice(-6)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, compressed, { upsert: true });

          setIsUploadingReceipt(false);

          if (uploadError) {
            setErrorMessage('No se pudo subir el comprobante. Verifica tu conexión.');
            return;
          }

          const { data: publicData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);

          uploadedReceiptUrl = publicData.publicUrl;
        }

        // Llamada al Server Action seguro
        const res = await submitQuickPayment({
          linkId: link.id,
          storeSlug: store.slug,
          customerName,
          customerPhone,
          paymentMethod: selectedMethod,
          amountPaidUsd: currentPayUsd,
          referenceNumber: referenceNumber.trim() || undefined,
          receiptUrl: uploadedReceiptUrl,
        });

        if (res.success) {
          setOrderResult(res);
        } else {
          setErrorMessage(res.error || 'Ocurrió un error al procesar el reporte de pago.');
        }
      } catch {
        setIsUploadingReceipt(false);
        setErrorMessage('Falla de comunicación con el servidor. Por favor intenta de nuevo.');
      }
    });
  };

  // Renderizador: Pantalla de Éxito y Cierre de Venta
  if (orderResult?.success) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
            <Check className="w-6 h-6 stroke-[1.5]" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-base font-medium text-neutral-950">Pago Reportado con Éxito</h1>
            <p className="text-xs text-neutral-500 font-normal leading-relaxed">
              Tu reporte ha sido enviado a {store.name}. El vendedor revisará la transacción a la brevedad.
            </p>
          </div>

          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2 text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 font-normal">Número de Pedido</span>
              <span className="font-semibold text-neutral-950">#{orderResult.orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 font-normal">Monto Notificado</span>
              <span className="font-semibold text-neutral-950">{formatUSD(currentPayUsd)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 font-normal">Método Utilizado</span>
              <span className="font-medium text-neutral-800">{selectedMethod}</span>
            </div>
          </div>

          {orderResult.whatsappConfirmationUrl && (
            <a
              href={orderResult.whatsappConfirmationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-950 hover:bg-neutral-900 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Share2 className="w-4 h-4 stroke-[1.5]" />
              Enviar Comprobante por WhatsApp
            </a>
          )}

          {/* Sello PLG de Preziso */}
          <div className="pt-4 border-t border-neutral-150">
            <a
              href="https://preziso.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 stroke-[1.5]" />
              Procesado de forma segura con Preziso
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 py-8 sm:py-12 px-4 selection:bg-neutral-950 selection:text-white">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Cabecera del Comercio */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-8 h-8 rounded-lg object-cover border border-neutral-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-600 font-medium text-xs">
                {store.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-neutral-950 leading-tight">{store.name}</p>
              <p className="text-[10px] text-neutral-400 font-normal">Terminal de Cobro Seguro</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 bg-white border border-neutral-200 px-2 py-1 rounded-lg shadow-2xs">
            <ShieldCheck className="w-3 h-3 text-emerald-700 stroke-[1.5]" />
            <span>Verificado</span>
          </div>
        </div>

        {/* Tarjeta del Recibo Digital */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Concepto
              </span>
              <h2 className="text-sm font-medium text-neutral-900 mt-0.5">
                {link.title || 'Liquidación de Pedido'}
              </h2>
            </div>
            {link.mode === 'catalog' && Array.isArray(link.items) && link.items.length > 0 && (
              <button
                type="button"
                onClick={() => setShowItemsAccordion(!showItemsAccordion)}
                className="flex items-center gap-1 text-[11px] font-normal text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <span>{link.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} productos</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 stroke-[1.5] transition-transform ${
                    showItemsAccordion ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </div>

          {/* Acordeón de ítems del catálogo */}
          <AnimatePresence>
            {showItemsAccordion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2 pt-2 border-t border-neutral-100"
              >
                {link.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 font-normal">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-neutral-900 font-semibold">
                      {formatUSD(item.price * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Totales y Conversión BCV */}
          <div className="pt-3 border-t border-neutral-100 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total a Pagar
              </p>
              <p className="text-2xl font-semibold text-neutral-950 tracking-tight mt-0.5">
                {formatUSD(currentPayUsd)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-normal text-neutral-400">
                Tasa BCV: {bcvRate.toFixed(2)}
              </span>
              <p className="text-sm font-semibold text-neutral-800 font-mono mt-0.5">
                {formatBs(currentPayBs)}
              </p>
            </div>
          </div>

          {/* Opciones de Abono si están habilitadas */}
          {link.allow_split_payments && (
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-neutral-600">
                  ¿Deseas realizar un abono parcial?
                </span>
                <input
                  type="checkbox"
                  checked={isSplitMode}
                  onChange={(e) => {
                    setIsSplitMode(e.target.checked);
                    if (!e.target.checked) setCustomPayAmount(totalDueUsd.toFixed(2));
                  }}
                  className="w-4 h-4 rounded-md border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                />
              </div>

              {isSplitMode && (
                <div className="pt-1">
                  <label className="block text-[11px] font-normal text-neutral-500 mb-1">
                    Indica el monto a transferir hoy (Mínimo {formatUSD(link.min_split_amount_usd)})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customPayAmount}
                    onChange={(e) => setCustomPayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-hidden focus:bg-white focus:border-neutral-950 transition-colors font-semibold"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selector de Método de Pago */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-neutral-700">
            Selecciona tu forma de pago
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeMethods.map((m) => {
              const isSelected = selectedMethod === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMethod(m)}
                  className={`py-2.5 px-3 rounded-xl border text-xs text-center transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-neutral-950 text-white font-medium border-neutral-950 shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 font-normal border-neutral-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span>{m}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjeta de Datos Bancarios para Transferir */}
        {parsedBankDetails.length > 0 && selectedMethod !== 'Efectivo' && (
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-[11px] font-medium tracking-wider text-neutral-400 uppercase">
                Datos para transferir
              </span>
              <button
                type="button"
                onClick={() => handleCopy(copyAllText, 'all')}
                className="flex items-center gap-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-950 transition-colors"
              >
                {copiedKey === 'all' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-700 stroke-[1.5]" />
                    <span className="text-emerald-700">Datos copiados</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 stroke-[1.5]" />
                    <span>Copiar todo</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {parsedBankDetails.map((item, idx) => {
                const isItemCopied = copiedKey === `item-${idx}`;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70"
                  >
                    <div className="min-w-0 pr-2">
                      {item.label && (
                        <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                          {item.label}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-neutral-950 truncate font-mono mt-0.5">
                        {item.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.textToCopy, `item-${idx}`)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg transition-colors shrink-0"
                      title="Copiar dato"
                    >
                      {isItemCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[1.5]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 stroke-[1.5]" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Formulario de Reporte de Pago */}
        <form onSubmit={handleSubmitPayment} className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-xs font-medium text-neutral-900">Confirma tu reporte</h3>
            <p className="text-[11px] text-neutral-400 font-normal">
              Ingresa tus datos para vincular el pago a tu pedido.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl text-xs text-red-700 font-normal flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 stroke-[1.5] mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Tu nombre y apellido *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. María Pérez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-hidden focus:bg-white focus:border-neutral-950 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Número de WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej. 04141234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-hidden focus:bg-white focus:border-neutral-950 transition-colors"
              />
            </div>

            {selectedMethod !== 'Efectivo' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Número de referencia bancaria
                </label>
                <input
                  type="text"
                  placeholder="Últimos 4 a 6 dígitos de la transferencia"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-hidden focus:bg-white focus:border-neutral-950 transition-colors font-mono"
                />
              </div>
            )}

            {/* Subida de Comprobante / Capture */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Comprobante de pago (Capture)
              </label>

              {!receiptPreview ? (
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-200 rounded-xl bg-neutral-50 hover:bg-neutral-100/60 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-neutral-400 stroke-[1.5] mb-1" />
                  <span className="text-xs font-medium text-neutral-700">Adjuntar capture</span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">PNG, JPG hasta 8MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleReceiptChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={receiptPreview}
                      alt="Comprobante"
                      className="w-10 h-10 object-cover rounded-lg border border-neutral-200"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-900 truncate">
                        {receiptFile?.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">Capture adjuntado</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReceiptChange(null)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 stroke-[1.5]" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || isUploadingReceipt}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-950 hover:bg-neutral-900 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-medium rounded-xl transition-all shadow-xs"
          >
            {isPending || isUploadingReceipt ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verificando y enviando...</span>
              </>
            ) : (
              <>
                <span>Notificar Pago</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
              </>
            )}
          </button>
        </form>

        {/* Footer Editorial con Sello de Marca */}
        <footer className="pt-2 text-center text-[11px] text-neutral-400 space-y-1">
          <p>Los fondos se transfieren de forma directa a la cuenta del comercio.</p>
          <p className="text-neutral-500 font-medium">
            Desarrollado con tecnología de Preziso
          </p>
        </footer>
      </div>
    </main>
  );
}