'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, FileText, CheckCircle2, Clock, AlertCircle, MessageCircle, DollarSign, ArrowLeft, Loader2, Copy, Check, ArrowUpRight, TrendingUp, XCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { AnimatePresence, motion } from 'framer-motion'

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
    isExpired: boolean
    isConverted: boolean
}

const QuoteStatusBadge = ({ status, isExpired }: { status: string, isExpired: boolean }) => {
    if (status === 'cancelled') {
        return <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-600 shrink-0"><XCircle size={14} strokeWidth={2.5} /> Cancelado</span>
    }
    if (status === 'paid' || status === 'completed') {
        return <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={14} strokeWidth={2.5} /> Convertido</span>
    }
    if (isExpired) {
        return <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 shrink-0"><Clock size={14} strokeWidth={2.5} /> Vencido</span>
    }
    return <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 shrink-0"><AlertCircle size={14} strokeWidth={2.5} /> Pendiente</span>
}

export default function QuotesPage() {
    const supabase = getSupabase()
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [storeSlug, setStoreSlug] = useState<string | null>(null)

    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const PAGE_SIZE = 20

    const fetchQuotes = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: store } = await supabase.from('stores').select('id, slug').eq('user_id', user.id).single()
            if (!store) return
            setStoreSlug(store.slug)

            const start = isInitial ? 0 : page * PAGE_SIZE
            const end = start + PAGE_SIZE - 1

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('store_id', store.id)
                .or('is_quote.eq.true,status.eq.quote')
                .order('created_at', { ascending: false })
                .range(start, end)

            if (error) throw error

            const now = new Date().getTime()
            const processed = (data || []).map((q: any) => ({
                ...q,
                isExpired: q.expires_at ? new Date(q.expires_at).getTime() < now : false,
                isConverted: q.status === 'paid' || q.status === 'completed'
            }))

            if (isInitial) setQuotes(processed)
            else setQuotes(prev => [...prev, ...processed])

            setHasMore(data.length === PAGE_SIZE)
        } catch (error) {
            console.error('Error fetching quotes:', error)
        } finally {
            setLoading(false)
        }
    }, [page, supabase])

    useEffect(() => {
        fetchQuotes(true)
        const channel = supabase
            .channel('quotes_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchQuotes(true))
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchQuotes])

    const filteredQuotes = useMemo(() => {
        return quotes.filter(q =>
            q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.order_number.toString().includes(searchTerm)
        )
    }, [quotes, searchTerm])

    const stats = useMemo(() => {
        const now = new Date().getTime()
        const active = quotes.filter(q => !q.isConverted && !q.isExpired && q.status !== 'cancelled')
        return {
            totalActive: active.length,
            activeAmount: active.reduce((acc, q) => acc + q.total_usd, 0),
            convertedCount: quotes.filter(q => q.isConverted).length,
            expiringSoon: active.filter(q => {
                if (!q.expires_at) return false
                const hoursLeft = (new Date(q.expires_at).getTime() - now) / (1000 * 60 * 60)
                return hoursLeft > 0 && hoursLeft <= 48
            }).length
        }
    }, [quotes])

    const handleCopy = (id: string) => {
        const link = `${window.location.protocol}//${storeSlug}.${window.location.host.replace('www.', '')}/quote/${id}`
        navigator.clipboard.writeText(link)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const sendWhatsAppFollowUp = (e: React.MouseEvent, quote: Quote) => {
        e.preventDefault()
        if (!quote.customer_phone) return
        const link = `${window.location.protocol}//${storeSlug}.${window.location.host.replace('www.', '')}/quote/${quote.id}`
        const message = `Hola ${quote.customer_name}, recordatorio de tu presupuesto #${quote.order_number}: ${link}`
        window.open(`https://wa.me/${quote.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-gray-900 selection:bg-[#3600ff] selection:text-white">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">

                {/* Header Superior */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-2 text-gray-400 mb-3">
                            <Link href="/admin" className="p-1.5 hover:bg-gray-200 rounded-xl transition-colors"><ArrowLeft size={16} strokeWidth={2.5} /></Link>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Panel Administrativo</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Presupuestos</h1>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Gestión de proformas y seguimiento B2B.</p>
                    </div>

                    <Link href="/admin/pos" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)]">
                        <FileText size={16} strokeWidth={2.5} /> Nuevo Presupuesto
                    </Link>
                </div>

                {/* Grid de Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                    {[
                        { label: 'Activos', value: stats.totalActive, icon: Clock, iconColor: 'text-[#3600ff]', bgIcon: 'bg-blue-50' },
                        { label: 'Monto Proyectado', value: `$${stats.activeAmount.toFixed(2)}`, icon: DollarSign, iconColor: 'text-gray-900', bgIcon: 'bg-gray-100' },
                        { label: 'Convertidos', value: stats.convertedCount, icon: TrendingUp, iconColor: 'text-emerald-600', bgIcon: 'bg-emerald-50' },
                        { label: 'Por Vencer', value: stats.expiringSoon, icon: AlertCircle, iconColor: 'text-orange-500', bgIcon: 'bg-orange-50' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100/80 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.03)] transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</span>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bgIcon} ${s.iconColor}`}><s.icon size={16} strokeWidth={2.5} /></div>
                            </div>
                            <p className="text-3xl font-black tracking-tighter text-gray-900 tabular-nums">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative mb-8">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} strokeWidth={2.5} />
                    <input type="text" placeholder="Buscar por cliente o número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl pl-14 pr-6 py-4 md:py-5 text-sm font-bold text-gray-900 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]" />
                </div>

                {/* 🚀 CONTENEDOR DE RESULTADOS RESPONSIVE */}
                {loading && page === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-zinc-300" size={40} /><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando...</p></div>
                ) : filteredQuotes.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center bg-white rounded-2xl border border-gray-100 shadow-sm"><div className="bg-gray-50 w-20 h-20 rounded-2xl flex items-center justify-center mb-6"><FileText className="text-zinc-300" size={32} /></div><p className="text-gray-900 font-bold text-lg">Sin resultados</p></div>
                ) : (
                    <div className="space-y-6">

                        {/* 📱 VISTA MOBILE (Card Grid con Divs) */}
                        <div className="md:hidden space-y-4">
                            {filteredQuotes.map((quote) => (
                                <div key={quote.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.03)] space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div><span className="text-xs font-black text-gray-900">#{quote.order_number}</span><p className="text-[10px] font-medium text-gray-400 mt-1">{new Date(quote.created_at).toLocaleDateString()}</p></div>
                                        <QuoteStatusBadge status={quote.status} isExpired={quote.isExpired} />
                                    </div>
                                    <div className="border-t border-gray-50 pt-4"><p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Cliente</p><span className="text-sm font-bold text-gray-900 block">{quote.customer_name}</span>{quote.customer_phone && <span className="text-[10px] font-medium text-gray-500 mt-1 block">{quote.customer_phone}</span>}</div>
                                    <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                                        <div><p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Monto Total</p><span className="text-xl font-black text-gray-900 tabular-nums">${quote.total_usd.toFixed(2)}</span><p className="text-[10px] font-mono font-medium text-gray-400">Bs {(quote.total_bs || 0).toLocaleString()}</p></div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCopy(quote.id)} className={`p-3 rounded-xl border transition-all active:scale-90 ${copiedId === quote.id ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white border-gray-200 text-gray-400 shadow-sm'}`}>{copiedId === quote.id ? <Check size={16} /> : <Copy size={16} />}</button>
                                            {!quote.isConverted && !quote.isExpired && quote.customer_phone && (<button onClick={(e) => sendWhatsAppFollowUp(e, quote)} className="p-3 bg-white text-gray-400 border border-gray-200 rounded-xl shadow-sm"><MessageCircle size={16} /></button>)}
                                            <a
                                                href={storeSlug ? `${window.location.protocol}//${storeSlug}.${window.location.host.replace('www.', '')}/quote/${quote.id}` : `/quote/${quote.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-gray-900 text-white rounded-xl shadow-sm hover:bg-[#3600ff] transition-colors"
                                            >
                                                <ArrowUpRight size={16} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 💻 VISTA DESKTOP (Tabla Tradicional) */}
                        <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_8px_30px_-4px_rgba(0,0,0,0.03)]">
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Orden / Fecha</th><th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Cliente</th><th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Estado</th><th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Monto (USD/BS)</th><th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Acciones</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredQuotes.map((quote) => (
                                            <tr key={quote.id} className="group hover:bg-gray-50 transition-colors duration-200">
                                                <td className="px-8 py-5"><span className="text-sm font-black text-gray-900">#{quote.order_number}</span><p className="text-[10px] font-medium text-gray-400 mt-1">{new Date(quote.created_at).toLocaleDateString()}</p></td>
                                                <td className="px-8 py-5"><span className="text-sm font-bold text-gray-900 block">{quote.customer_name}</span>{quote.customer_phone && <span className="text-[10px] font-medium text-gray-500 mt-0.5 block">{quote.customer_phone}</span>}</td>
                                                <td className="px-8 py-5"><QuoteStatusBadge status={quote.status} isExpired={quote.isExpired} /></td>
                                                <td className="px-8 py-5 text-right"><span className="text-sm font-black text-gray-900 block tabular-nums">${quote.total_usd.toFixed(2)}</span><span className="text-[10px] font-mono font-medium text-gray-400 mt-0.5 block">Bs {(quote.total_bs || 0).toLocaleString()}</span></td>
                                                <td className="px-8 py-5"><div className="flex items-center justify-end gap-2 md:opacity-40 md:group-hover:opacity-100 transition-opacity"><button onClick={() => handleCopy(quote.id)} className={`p-2.5 rounded-xl transition-all active:scale-90 ${copiedId === quote.id ? 'bg-emerald-50 text-emerald-600' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 shadow-sm'}`}>{copiedId === quote.id ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2} />}</button>{!quote.isConverted && !quote.isExpired && quote.customer_phone && (<button onClick={(e) => sendWhatsAppFollowUp(e, quote)} className="flex items-center gap-2 px-3 py-2.5 bg-white text-gray-600 hover:text-green-700 hover:border-green-200 border border-gray-200 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-sm"><MessageCircle size={16} /> <span className="hidden sm:inline">Notificar</span></button>)}<a 
    href={storeSlug ? `${window.location.protocol}//${storeSlug}.${window.location.host.replace('www.', '')}/quote/${quote.id}` : `/quote/${quote.id}`}
    target="_blank" 
    rel="noopener noreferrer"
    className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-[#3600ff] transition-all active:scale-95 flex items-center shadow-sm"
    title="Ver Proforma"
>
    <ArrowUpRight size={16} strokeWidth={2.5}/>
</a></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {hasMore && (<div className="p-8 border-t border-gray-100 flex justify-center bg-gray-50/50"><button onClick={() => setPage(p => p + 1)} disabled={loading} className="inline-flex items-center gap-2 px-8 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50 shadow-sm active:scale-95">{loading ? <Loader2 className="animate-spin" size={16} strokeWidth={2.5} /> : <><ChevronDown size={16} strokeWidth={2.5} /> Cargar más presupuestos</>}</button></div>)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}