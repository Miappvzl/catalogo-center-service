'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, CheckCircle, Lock, Copy, Check, Wallet, Globe, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { PREZISO_BILLING } from '@/lib/config/billing'
import Link from 'next/link'

export default function SubscriptionPage() {
    const supabase = getSupabase()
    const [rate, setRate] = useState<number>(0)
    const [store, setStore] = useState<any>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

useEffect(() => {
        const getData = async () => {
            // 1. Obtener Tasa BCV desde tu tabla app_config
            const { data: configData } = await supabase
                .from('app_config')
                .select('usd_rate')
                .eq('id', 1) // Aseguramos traer la fila de configuración principal
                .single()
                
            if (configData && configData.usd_rate) {
                setRate(configData.usd_rate)
            }

            // 2. Obtener datos de la tienda actual para el reporte
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: storeData } = await supabase.from('stores').select('id, name').eq('user_id', user.id).single()
                setStore(storeData)
            }
        }
        getData()
    }, [])

    const amountBs = (PREZISO_BILLING.priceUSD * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleReportPayment = () => {
        const message = PREZISO_BILLING.generateReportMessage(store?.name || 'Tienda', store?.id || 'ID-Pendiente', amountBs)
        const url = `https://wa.me/${PREZISO_BILLING.whatsappContact}?text=${encodeURIComponent(message)}`
        
        // Primero mostramos nuestro modal de tranquilidad
        setShowSuccessModal(true)
        
        // Pequeño delay para que lean el modal antes de saltar a WA
        setTimeout(() => {
            window.open(url, '_blank')
        }, 2000)
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 font-sans selection:bg-black selection:text-white">
            <div className="w-full max-w-[440px] flex flex-col gap-6">
                
                {/* CARD PRINCIPAL */}
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Header Minimalista */}
                    <div className="p-8 text-center border-b border-gray-50 bg-gray-50/30">
                        <div className="inline-flex p-3 rounded-2xl bg-black text-white mb-4">
                            <Lock size={24} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Membresía Preziso</h1>
                        <p className="text-gray-400 text-sm mt-1 font-medium">Tu periodo de prueba ha finalizado.</p>
                    </div>

                    <div className="p-8 space-y-8">
                       {/* Precio Dual y Tasa BCV */}
                        <div className="text-center">
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-black text-gray-900">${PREZISO_BILLING.priceUSD}</span>
                                <span className="text-gray-400 font-bold text-sm">/mes</span>
                            </div>
                            
                            {/* Gatillo Dinámico BCV */}
                            <div className="mt-3 flex justify-center">
                                {rate > 0 ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100/50 rounded-full text-[11px] font-black uppercase tracking-widest text-emerald-700 transition-all">
                                        <span>≈ Bs {amountBs} (BCV)</span>
                                        <div className="w-px h-3 bg-emerald-200 mx-0.5"></div>
                                        <button 
                                            onClick={() => copyToClipboard(amountBs, 'monto')}
                                            className="text-emerald-600 hover:text-emerald-900 transition-colors flex items-center gap-1 active:scale-90"
                                            title="Copiar monto exacto en Bolívares"
                                        >
                                            {copiedId === 'monto' ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={2.5} />}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                        <Loader2 size={12} className="animate-spin" /> Calculando Tasa...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Métodos de Pago */}
                        <div className="space-y-4">
                            {/* Pago Móvil */}
                            <div className="p-4 rounded-2xl border border-gray-100 bg-white group transition-all hover:border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                                        <Wallet size={16} className="text-gray-400" />
                                        Pago Móvil
                                    </div>
                                    <span className="text-[10px] font-black text-gray-300 uppercase">Venezuela</span>
                                </div>
                                <div className="space-y-2">
                                    <DataRow label="Banco" value={PREZISO_BILLING.pagoMovil.banco} />
                                    <DataRow 
                                        label="Teléfono" 
                                        value={PREZISO_BILLING.pagoMovil.telefono} 
                                        onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.telefono, 'tlf')}
                                        isCopied={copiedId === 'tlf'}
                                    />
                                    <DataRow 
                                        label="Cédula" 
                                        value={PREZISO_BILLING.pagoMovil.cedula} 
                                        onCopy={() => copyToClipboard(PREZISO_BILLING.pagoMovil.cedula, 'ci')}
                                        isCopied={copiedId === 'ci'}
                                    />
                                </div>
                            </div>

                            {/* Otros Métodos */}
                            <div className="p-4 rounded-2xl border border-gray-100 bg-white transition-all hover:border-gray-200">
                                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm mb-4">
                                    <Globe size={16} className="text-gray-400" />
                                    Global Wallets
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => copyToClipboard(PREZISO_BILLING.wallets.binanceId, 'binance')}
                                        className="p-3 rounded-xl border border-gray-50 bg-gray-50/50 text-center transition-all active:scale-95"
                                    >
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Binance ID</p>
                                        <p className="text-xs font-black text-gray-900 mt-0.5">{copiedId === 'binance' ? '¡Copiado!' : PREZISO_BILLING.wallets.binanceId}</p>
                                    </button>
                                    <button 
                                        onClick={() => copyToClipboard(PREZISO_BILLING.wallets.zinliEmail, 'zinli')}
                                        className="p-3 rounded-xl border border-gray-50 bg-gray-50/50 text-center transition-all active:scale-95"
                                    >
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Zinli / Email</p>
                                        <p className="text-xs font-black text-gray-900 mt-0.5 truncate px-1">{copiedId === 'zinli' ? '¡Copiado!' : PREZISO_BILLING.wallets.zinliEmail}</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Botón Principal */}
                        <button 
                            onClick={handleReportPayment}
                            className="w-full bg-black text-white py-5 rounded-[20px] font-black text-sm flex items-center justify-center gap-2 transition-all hover:bg-gray-900 active:scale-[0.98] shadow-none"
                        >
                            <MessageCircle size={18} /> Reportar Pago vía WhatsApp
                        </button>
                    </div>
                </div>

                {/* Enlace de Retorno */}
                <div className="text-center">
                    <Link href="/admin" className="text-xs font-bold text-gray-400 hover:text-black transition-colors">
                        Volver al Panel de Control
                    </Link>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN (SUCCESS) */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/80 backdrop-blur-md" />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white border border-gray-100 p-8 rounded-[40px] shadow-xl max-w-sm text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck size={40} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Pago Enviado</h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                Tu reporte ha sido generado. Verificaremos el pago y serás reconectado en breve.
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

function DataRow({ label, value, onCopy, isCopied }: any) {
    return (
        <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-400 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{value}</span>
                {onCopy && (
                    <button onClick={onCopy} className="text-gray-300 hover:text-black transition-colors">
                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                )}
            </div>
        </div>
    )
}