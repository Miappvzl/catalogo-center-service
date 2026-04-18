'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, FileText, CheckCircle2, Clock, AlertCircle, MessageCircle, DollarSign, ArrowLeft, Loader2, Copy, Check, ArrowUpRight, TrendingUp, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { AnimatePresence, motion } from 'framer-motion'
import { any } from 'zod'

// --- TIPOS ESTRICTOS ---
interface Quote {
    id: string
    order_number: number
    created_at: string
    expires_at: string | null
    converted_at: string | null
    status: string
    is_quote: boolean
    customer_name: string
    customer_phone: string | null
    total_usd: number
    total_bs: number | null
}

const QuoteStatusBadge = ({ status, isExpired }: { status: string, isExpired: boolean }) => {
    // 🚀 Clean Look: Bordes controlados (rounded-md), sin sombras, colores sólidos pastel
    if (status === 'cancelled') {
        return <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-red-50 text-red-700  shrink-0"><XCircle size={12} strokeWidth={2.5} /> Cancelado</span>
    }
    if (status !== 'quote') {
        return <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700  shrink-0"><CheckCircle2 size={12} strokeWidth={2.5} /> Convertido</span>
    }
    if (isExpired) {
        return <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700  shrink-0"><AlertCircle size={12} strokeWidth={2.5} /> Vencido</span>
    }
    return <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-700  shrink-0"><Clock size={12} strokeWidth={2.5} /> Activo</span>
}
export default function QuotesPage() {
    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'converted' | 'expired'>('all')
    const [kpiStats, setKpiStats] = useState({ activeAmount: 0, conversionRate: 0, expiringSoon: 0 })
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [storeInfo, setStoreInfo] = useState<{ id: string, slug: string, name: string } | null>(null)

    useEffect(() => {
        const fetchQuotes = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: store } = await supabase.from('stores').select('id, slug, name').eq('user_id', user.id).single()
            if (!store) return
            setStoreInfo(store)

            // Buscamos todas las órdenes que son presupuestos (is_quote = true) o que su status es quote (por compatibilidad)
            const { data: quotesData } = await supabase
                .from('orders')
                .select('*')
                .eq('store_id', store.id)
                .or('is_quote.eq.true,status.eq.quote')
                .order('created_at', { ascending: false })

            if (quotesData) {
                setQuotes(quotesData as Quote[])
                
                // Calcular KPIs de Negocio
                const activeQuotes = quotesData.filter((q : any) =>  q.status === 'quote')
                const convertedQuotes = quotesData.filter((q : any) => q.status !== 'quote' && q.status !== 'cancelled')
                const activeAmount = activeQuotes.reduce((acc : number, q : any) => acc + Number(q.total_usd), 0)
                const convRate = quotesData.length > 0 ? (convertedQuotes.length / quotesData.length) * 100 : 0
                
                setKpiStats({
                    activeAmount,
                    conversionRate: convRate,
                    expiringSoon: activeQuotes.length // Aquí puedes añadir lógica de fechas después
                })
            }
            setLoading(false)
        }
        fetchQuotes()
    }, [supabase])

    const getQuoteLink = (orderId: string) => {
        if (!storeInfo?.slug) return ''
        const host = window.location.host.replace('www.', '')
        return `${window.location.protocol}//${storeInfo.slug}.${host}/quote/${orderId}`
    }

    const handleCopy = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        navigator.clipboard.writeText(getQuoteLink(id))
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const sendWhatsAppFollowUp = (e: React.MouseEvent, quote: Quote) => {
        e.stopPropagation()
        if (!quote.customer_phone) return Swal.fire('Sin Teléfono', 'Este presupuesto no tiene un número registrado.', 'info')
        
        const link = getQuoteLink(quote.id)
        const message = `Hola ${quote.customer_name}, te escribo de *${storeInfo?.name}*.\n\nTe comparto el enlace de tu presupuesto #${quote.order_number} por *$${Number(quote.total_usd).toFixed(2)}* para que puedas revisarlo o completarlo cuando gustes:\n\n${link}\n\n¿Tienes alguna duda con la que pueda ayudarte?`
        window.open(`https://wa.me/${quote.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const filteredQuotes = useMemo(() => {
        const now = new Date().getTime()
        return quotes.filter(q => {
            const matchesSearch = q.customer_name?.toLowerCase().includes(search.toLowerCase()) || q.order_number?.toString().includes(search)
            
            const isExpired = q.expires_at ? new Date(q.expires_at).getTime() < now : false
            const isActive = q.status === 'quote' && !isExpired
            const isConverted = q.status !== 'quote' && q.status !== 'cancelled'

            const matchesFilter = 
                filterStatus === 'all' || 
                (filterStatus === 'active' && isActive) ||
                (filterStatus === 'converted' && isConverted) ||
                (filterStatus === 'expired' && isExpired)

            return matchesSearch && matchesFilter
        })
    }, [quotes, search, filterStatus])

    return (
        <div className="min-h-screen bg-[#F6F6F6] pb-20 font-sans text-gray-900 flex flex-col">
            
            {/* HEADER STICKY */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 bg-transparent hover:bg-gray-50 rounded-[var(--radius-btn)] transition-all group shrink-0">
                        <ArrowLeft size={18} className="text-gray-500 group-hover:text-black" />
                    </Link>
                    <div>
                        <h1 className="font-black text-xl tracking-tight leading-none flex items-center gap-2">Presupuestos</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">CRM y Preventa</p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-6 md:space-y-8 flex-1">

                {/* 🚀 KPI CARDS (Minimalistas, sin sombras, bordes de 1px) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="bg-white p-5 rounded-[var(--radius-card)] flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-zinc-50 text-zinc-900 rounded-lg border border-zinc-100"><DollarSign size={18} strokeWidth={2.5}/></div>
                            <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md uppercase tracking-widest">En Seguimiento</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-900">${kpiStats.activeAmount.toFixed(2)}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Potencial de Venta</p>
                        </div>
                    </div>

                   

                    <div className="bg-white p-5 rounded-[var(--radius-card)] flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-zinc-50 text-zinc-900 rounded-lg border border-zinc-100"><TrendingUp size={18} strokeWidth={2.5}/></div>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-900">{kpiStats.conversionRate.toFixed(1)}%</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Tasa de Cierre</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-[var(--radius-card)]  flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-zinc-50 text-zinc-900 rounded-lg border border-zinc-100"><Clock size={18} strokeWidth={2.5}/></div>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-900">{kpiStats.expiringSoon}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Presupuestos Activos</p>
                        </div>
                    </div>
                </div>

               {/* 🚀 FILTROS Y BUSCADOR (Segmented Control Elite - Protegido contra desbordamiento) */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center w-full min-w-0">
                    
                    {/* Contenedor con scroll interno blindado */}
                    <div className="w-full lg:w-auto overflow-x-auto no-scrollbar shrink-0">
                        <div className="flex bg-white p-1 rounded-[var(--radius-btn)]  w-max">
                            {['all', 'active', 'converted', 'expired'].map(status => (
                                <button
                                    key={status} onClick={() => setFilterStatus(status as any)}
                                    className={`shrink-0 px-4 py-2 rounded-[var(--radius-btn)] text-xs font-bold capitalize transition-all whitespace-nowrap ${filterStatus === status ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                                >
                                    {status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : status === 'converted' ? 'Convertidos' : 'Vencidos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative group w-full lg:w-80 shrink-0 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" size={16} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente o cotización..." className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition-colors placeholder:text-zinc-400" />
                    </div>
                </div>
                {/* 🚀 VISTA DE DATOS: RESPONSIVE SWAP (Cards en Mobile, Tabla en Desktop) */}
                <div className="w-full min-w-0">
                    {loading ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin text-zinc-300 mx-auto" size={32} /></div>
                    ) : filteredQuotes.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-200 w-full">
                            <div className="w-14 h-14 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-zinc-400"><FileText size={20} /></div>
                            <p className="text-zinc-500 font-bold text-sm">No hay presupuestos para mostrar.</p>
                        </div>
                    ) : (
                        <div className="w-full min-w-0 flex flex-col gap-4">
                            
                            {/* =========================================
                                VERSIÓN MOBILE (Tarjetas Apiladas)
                            ========================================= */}
                            <div className="flex flex-col gap-3 md:hidden w-full min-w-0">
                                {filteredQuotes.map(quote => {
                                    const isExpired = quote.expires_at ? new Date(quote.expires_at).getTime() < new Date().getTime() : false;
                                    const isConverted = quote.status !== 'quote' && quote.status !== 'cancelled';
                                    
                                    return (
                                        <div key={`mob-${quote.id}`} className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col gap-4 w-full">
                                            {/* Cabecera: ID y Estado */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-black text-zinc-900 leading-none">#{quote.order_number}</span>
                                                    <p className="text-[10px] font-mono text-zinc-400 mt-1">{new Date(quote.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <QuoteStatusBadge status={quote.status} isExpired={isExpired} />
                                            </div>
                                            
                                            {/* Cuerpo: Cliente */}
                                            <div>
                                                <span className="font-bold text-sm text-zinc-900 block truncate">{quote.customer_name}</span>
                                                {quote.customer_phone && <span className="text-[11px] font-mono text-zinc-500 mt-0.5 block">{quote.customer_phone}</span>}
                                            </div>
                                            
                                            {/* Footer: Monto y Acciones */}
                                            <div className="flex justify-between items-end pt-3 border-t border-zinc-100">
                                                <p className={`font-black text-xl tabular-nums tracking-tight ${isConverted ? 'text-emerald-600' : 'text-zinc-900'}`}>
                                                    ${Number(quote.total_usd).toFixed(2)}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={(e) => handleCopy(e, quote.id)} className="p-2.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-lg active:scale-95 transition-all">
                                                        {copiedId === quote.id ? <Check size={16} className="text-emerald-600"/> : <Copy size={16}/>}
                                                    </button>
                                                    {!isConverted && quote.customer_phone && (
                                                        <button onClick={(e) => sendWhatsAppFollowUp(e, quote)} className="p-2.5 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg active:scale-95 transition-all">
                                                            <MessageCircle size={16} />
                                                        </button>
                                                    )}
                                                    <a href={getQuoteLink(quote.id)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-900 border border-zinc-900 text-white rounded-lg active:scale-95 transition-all">
                                                        <ArrowUpRight size={16}/>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* =========================================
                                VERSIÓN DESKTOP (Tabla Clean Look)
                            ========================================= */}
                            <div className="hidden md:block bg-white rounded-xl overflow-hidden w-full border border-zinc-200 min-w-0">
                                <div className="overflow-x-auto w-full no-scrollbar">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-zinc-50 border-b border-zinc-200 text-[9px] uppercase tracking-widest text-zinc-500">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Doc #</th>
                                                <th className="px-6 py-4 font-bold">Cliente / Prospecto</th>
                                                <th className="px-6 py-4 font-bold">Estado</th>
                                                <th className="px-6 py-4 font-bold text-right">Potencial</th>
                                                <th className="px-6 py-4 font-bold text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {filteredQuotes.map(quote => {
                                                const isExpired = quote.expires_at ? new Date(quote.expires_at).getTime() < new Date().getTime() : false;
                                                const isConverted = quote.status !== 'quote' && quote.status !== 'cancelled';
                                                
                                                return (
                                                <tr key={`desk-${quote.id}`} className="hover:bg-zinc-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <span className="font-black text-zinc-900">#{quote.order_number}</span>
                                                        <p className="text-[10px] font-mono text-zinc-400 mt-1">{new Date(quote.created_at).toLocaleDateString()}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-zinc-900 block truncate max-w-[250px] lg:max-w-[350px]">{quote.customer_name}</span>
                                                        {quote.customer_phone && <span className="text-xs font-mono text-zinc-500 mt-0.5 block">{quote.customer_phone}</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <QuoteStatusBadge status={quote.status} isExpired={isExpired} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className={`font-black text-lg tabular-nums ${isConverted ? 'text-emerald-600' : 'text-zinc-900'}`}>${Number(quote.total_usd).toFixed(2)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => handleCopy(e, quote.id)} className="p-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:border-zinc-400 hover:text-zinc-900 transition-all active:scale-95" title="Copiar Link">
                                                                {copiedId === quote.id ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                                                            </button>
                                                            {!isConverted && quote.customer_phone && (
                                                                <button onClick={(e) => sendWhatsAppFollowUp(e, quote)} className="flex items-center gap-1.5 px-3 py-2 bg-white text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 border border-zinc-200 rounded-lg text-xs font-bold transition-all active:scale-95">
                                                                    <MessageCircle size={14} /> <span>Recordar</span>
                                                                </button>
                                                            )}
                                                            <a href={getQuoteLink(quote.id)} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 border border-zinc-900 text-white rounded-lg hover:bg-black transition-all active:scale-95" title="Ver Documento">
                                                                <ArrowUpRight size={14}/>
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}