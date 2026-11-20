'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    Search,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    MessageCircle,
    ArrowLeft,
    Loader2,
    Copy,
    Check,
    ArrowUpRight,
    XCircle,
    PenSquare,
    Plus,
} from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import { formatUSD, formatVES } from '@/utils/currency'

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
    customer_dni?: string | null
    total_usd: number
    total_bs: number | null
    exchange_rate: number | null
    isExpired: boolean
    isConverted: boolean
}

// 💎 CLEANLOOK: Badges Muted con bordes ultra-finos (Homologados con orders/page.tsx)
const QuoteStatusBadge = ({ status, isExpired }: { status: string; isExpired: boolean }) => {
    if (status === 'cancelled') {
        return (
            <span className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 bg-rose-50 text-rose-700 border-rose-200/50">
                <XCircle size={10} strokeWidth={3} />
                Cancelado
            </span>
        )
    }
    if (status === 'paid' || status === 'completed' || status === 'shipped') {
        return (
            <span className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200/50">
                <CheckCircle2 size={10} strokeWidth={3} />
                Convertido
            </span>
        )
    }
    if (isExpired) {
        return (
            <span className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 bg-neutral-100 text-neutral-500 border-neutral-200/60">
                <Clock size={10} strokeWidth={3} />
                Vencido
            </span>
        )
    }
    return (
        <span className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-50 text-amber-700 border-amber-200/50">
            <AlertCircle size={10} strokeWidth={3} />
            Pendiente
        </span>
    )
}

export default function QuotesPage() {
    const supabase = getSupabase()
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterTab, setFilterTab] = useState<'all' | 'active' | 'converted' | 'expired'>('all')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [storeSlug, setStoreSlug] = useState<string | null>(null)

    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const PAGE_SIZE = 20

    const fetchQuotes = useCallback(
        async (pageIndex = 0, isInitial = false) => {
            if (isInitial) {
                setLoading(true)
                setPage(0)
            } else {
                setLoadingMore(true)
            }

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser()
                if (!user) return

                const { data: store } = await supabase
                    .from('stores')
                    .select('id, slug')
                    .eq('user_id', user.id)
                    .single()
                if (!store) return
                setStoreSlug(store.slug)

                const start = isInitial ? 0 : pageIndex * PAGE_SIZE
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
                const processed: Quote[] = (data || []).map((q: any) => ({
                    ...q,
                    isExpired: q.expires_at ? new Date(q.expires_at).getTime() < now : false,
                    isConverted:
                        q.status === 'paid' || q.status === 'completed' || q.status === 'shipped',
                }))

                if (isInitial) setQuotes(processed)
                else setQuotes((prev) => [...prev, ...processed])

                setHasMore((data || []).length === PAGE_SIZE)
            } catch (error) {
                console.error('Error fetching quotes:', error)
            } finally {
                setLoading(false)
                setLoadingMore(false)
            }
        },
        [supabase]
    )

    useEffect(() => {
        fetchQuotes(0, true)
        const channel = supabase
            .channel('quotes_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => fetchQuotes(0, true)
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchQuotes])

    const filteredQuotes = useMemo(() => {
        return quotes.filter((q) => {
            const matchesSearch =
                q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.order_number?.toString().includes(searchTerm) ||
                (q.customer_dni && q.customer_dni.toLowerCase().includes(searchTerm.toLowerCase()))

            if (!matchesSearch) return false

            if (filterTab === 'active') {
                return !q.isConverted && !q.isExpired && q.status !== 'cancelled'
            }
            if (filterTab === 'converted') {
                return q.isConverted
            }
            if (filterTab === 'expired') {
                return q.isExpired || q.status === 'cancelled'
            }
            return true
        })
    }, [quotes, searchTerm, filterTab])

    const stats = useMemo(() => {
        const now = new Date().getTime()
        const active = quotes.filter((q) => !q.isConverted && !q.isExpired && q.status !== 'cancelled')
        return {
            totalActive: active.length,
            activeAmount: active.reduce((acc, q) => acc + Number(q.total_usd || 0), 0),
            convertedCount: quotes.filter((q) => q.isConverted).length,
            expiringSoon: active.filter((q) => {
                if (!q.expires_at) return false
                const hoursLeft = (new Date(q.expires_at).getTime() - now) / (1000 * 60 * 60)
                return hoursLeft > 0 && hoursLeft <= 48
            }).length,
        }
    }, [quotes])

    const getQuoteUrl = (id: string) => {
        if (typeof window === 'undefined') return `/quote/${id}`
        const host = window.location.host.replace('www.', '')
        return storeSlug
            ? `${window.location.protocol}//${storeSlug}.${host}/quote/${id}`
            : `/quote/${id}`
    }

    const handleCopy = (id: string) => {
        const link = getQuoteUrl(id)
        navigator.clipboard.writeText(link)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const sendWhatsAppFollowUp = (e: React.MouseEvent, quote: Quote) => {
        e.preventDefault()
        if (!quote.customer_phone) return
        const link = getQuoteUrl(quote.id)
        const message = `Hola ${quote.customer_name}, te compartimos el enlace de tu presupuesto #${quote.order_number}: ${link}`
        window.open(
            `https://wa.me/${quote.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
            '_blank'
        )
    }

    const getBsEquivalent = (quote: Quote) => {
        if (quote.total_bs && Number(quote.total_bs) > 0) return Number(quote.total_bs)
        if (quote.exchange_rate && Number(quote.exchange_rate) > 0) {
            return Number(quote.total_usd || 0) * Number(quote.exchange_rate)
        }
        return 0
    }

    return (
        <div className="min-h-screen bg-[#F6F6F6] pb-20 font-sans text-neutral-900 flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
            {/* 💎 HEADER STICKY CLEANLOOK */}
            <div className="bg-[#F6F6F6]/95 backdrop-blur-md border-b border-neutral-200/50 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-colors shrink-0 shadow-xs"
                    >
                        <ArrowLeft size={16} className="text-neutral-500 hover:text-neutral-900" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-base tracking-tight leading-none text-neutral-900">
                            Presupuestos
                        </h1>
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">
                            Proformas & Seguimiento B2B
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fetchQuotes(0, true)}
                        className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 hover:text-neutral-900 transition-all active:rotate-180 duration-500 shrink-0 shadow-xs cursor-pointer"
                        title="Sincronizar Presupuestos"
                    >
                        <Clock size={15} className="text-neutral-500" />
                    </button>

                    <Link
                        href="/admin/pos"
                        className="h-9 px-3.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo Presupuesto</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Link>
                </div>
            </div>

            <div className="w-full max-w-[100vw] overflow-x-hidden flex-1">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
                    {/* 💎 KPI CARDS (Bento Grid Style idéntico a Gestión de Pedidos) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
                        <div className="bg-white p-5 rounded-xl border border-neutral-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-0 flex flex-col justify-between">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 truncate">
                                Activos
                            </p>
                            <span className="text-2xl md:text-3xl font-bold text-neutral-900 font-mono tabular-nums truncate">
                                {stats.totalActive}
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-neutral-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-0 flex flex-col justify-between">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 truncate">
                                Monto Proyectado
                            </p>
                            <span className="text-2xl md:text-3xl font-bold text-neutral-900 font-mono tabular-nums truncate">
                                {formatUSD(stats.activeAmount)}
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-neutral-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-0 flex flex-col justify-between">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 truncate">
                                Convertidos
                            </p>
                            <span className="text-2xl md:text-3xl font-bold text-emerald-700 font-mono tabular-nums truncate">
                                {stats.convertedCount}
                            </span>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-neutral-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.01)] min-w-0 flex flex-col justify-between">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 truncate">
                                Por Vencer (48h)
                            </p>
                            <span className="text-2xl md:text-3xl font-bold text-amber-600 font-mono tabular-nums truncate">
                                {stats.expiringSoon}
                            </span>
                        </div>
                    </div>

                    {/* 💎 FILTROS PILL TABS Y BÚSQUEDA */}
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center w-full">
                        <div className="flex bg-neutral-100/60 p-1 rounded-lg border border-neutral-200/50 shrink-0 w-full overflow-x-auto no-scrollbar lg:w-auto max-w-full">
                            {(
                                [
                                    { id: 'all', label: 'Todos' },
                                    { id: 'active', label: 'Pendientes' },
                                    { id: 'converted', label: 'Convertidos' },
                                    { id: 'expired', label: 'Vencidos / Cancelados' },
                                ] as const
                            ).map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setFilterTab(tab.id)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                        filterTab === tab.id
                                            ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/50'
                                            : 'text-neutral-500 hover:text-neutral-900 border border-transparent hover:bg-neutral-50/50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative group w-full lg:w-80 shrink-0">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors"
                                size={15}
                            />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por cliente, RIF o número..."
                                className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* 💎 RESULTADOS RESPONSIVE */}
                    {loading && page === 0 ? (
                        <div className="text-center py-20">
                            <Loader2 className="animate-spin text-neutral-300 mx-auto" size={24} />
                        </div>
                    ) : filteredQuotes.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                            <div className="w-12 h-12 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-neutral-300">
                                <FileText size={20} />
                            </div>
                            <p className="text-neutral-500 font-semibold text-xs">
                                No se encontraron presupuestos.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* 📱 VISTA MOBILE (Tarjetas Cleanlook) */}
                            <div className="md:hidden space-y-3 w-full">
                                {filteredQuotes.map((quote) => {
                                    const bsAmount = getBsEquivalent(quote)
                                    const canEdit =
                                        !quote.isConverted && quote.status !== 'cancelled'

                                    return (
                                        <div
                                            key={quote.id}
                                            className="bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] p-4.5 space-y-3.5"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs font-bold text-neutral-900 font-mono">
                                                        #{quote.order_number}
                                                    </span>
                                                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                                        {new Date(
                                                            quote.created_at
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <QuoteStatusBadge
                                                    status={quote.status}
                                                    isExpired={quote.isExpired}
                                                />
                                            </div>

                                            <div className="border-t border-neutral-100 pt-3">
                                                <p className="font-semibold text-xs text-neutral-900 truncate">
                                                    {quote.customer_name}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-neutral-400">
                                                    {quote.customer_dni && (
                                                        <span>{quote.customer_dni}</span>
                                                    )}
                                                    {quote.customer_phone && (
                                                        <span>{quote.customer_phone}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end border-t border-neutral-100 pt-3">
                                                <div>
                                                    <span className="text-base font-bold text-neutral-900 font-mono tabular-nums block leading-none">
                                                        {formatUSD(quote.total_usd)}
                                                    </span>
                                                    {bsAmount > 0 && (
                                                        <span className="text-[10px] font-mono text-neutral-400 mt-1 block">
                                                            {formatVES(bsAmount)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    {canEdit && (
                                                        <Link
                                                            href={`/admin/pos?edit_quote=${quote.id}`}
                                                            className="p-2 bg-white text-neutral-700 hover:text-neutral-950 border border-neutral-200/70 rounded-lg shadow-2xs transition-all active:scale-95"
                                                            title="Editar Presupuesto"
                                                        >
                                                            <PenSquare size={14} />
                                                        </Link>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(quote.id)}
                                                        className={`p-2 rounded-lg border transition-all active:scale-95 ${
                                                            copiedId === quote.id
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                                                : 'bg-white border-neutral-200/70 text-neutral-500 shadow-2xs'
                                                        }`}
                                                        title="Copiar enlace"
                                                    >
                                                        {copiedId === quote.id ? (
                                                            <Check size={14} />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
                                                    </button>
                                                    {canEdit &&
                                                        !quote.isExpired &&
                                                        quote.customer_phone && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) =>
                                                                    sendWhatsAppFollowUp(e, quote)
                                                                }
                                                                className="p-2 bg-white text-neutral-500 hover:text-emerald-700 border border-neutral-200/70 rounded-lg shadow-2xs transition-all active:scale-95"
                                                                title="Recordatorio por WhatsApp"
                                                            >
                                                                <MessageCircle size={14} />
                                                            </button>
                                                        )}
                                                    <a
                                                        href={getQuoteUrl(quote.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-neutral-950 text-white rounded-lg shadow-2xs hover:bg-neutral-800 transition-colors"
                                                        title="Abrir Proforma"
                                                    >
                                                        <ArrowUpRight size={14} />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* 💻 VISTA DESKTOP (Tabla Ejecutiva Cleanlook) */}
                            <div className="hidden md:block bg-white rounded-xl overflow-hidden w-full border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-neutral-50/50 border-b border-neutral-200/50 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                                            <tr>
                                                <th className="px-6 py-3.5">Proforma</th>
                                                <th className="px-6 py-3.5">Fecha</th>
                                                <th className="px-6 py-3.5">Cliente</th>
                                                <th className="px-6 py-3.5">Estado</th>
                                                <th className="px-6 py-3.5 text-right">
                                                    Monto Total
                                                </th>
                                                <th className="px-6 py-3.5 text-right">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {filteredQuotes.map((quote) => {
                                                const bsAmount = getBsEquivalent(quote)
                                                const canEdit =
                                                    !quote.isConverted &&
                                                    quote.status !== 'cancelled'

                                                return (
                                                    <tr
                                                        key={quote.id}
                                                        className="hover:bg-neutral-50/40 transition-colors group"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="font-bold text-xs font-mono text-neutral-900">
                                                                #{quote.order_number}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-neutral-500 text-[11px]">
                                                            {new Date(
                                                                quote.created_at
                                                            ).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-semibold text-xs text-neutral-900 block">
                                                                {quote.customer_name}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-neutral-400">
                                                                {quote.customer_dni && (
                                                                    <span>
                                                                        {quote.customer_dni}
                                                                    </span>
                                                                )}
                                                                {quote.customer_phone && (
                                                                    <span>
                                                                        {quote.customer_phone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <QuoteStatusBadge
                                                                status={quote.status}
                                                                isExpired={quote.isExpired}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <span className="font-bold text-sm font-mono tabular-nums text-neutral-900 block">
                                                                {formatUSD(quote.total_usd)}
                                                            </span>
                                                            {bsAmount > 0 && (
                                                                <span className="text-[10px] font-mono text-neutral-400 mt-0.5 block">
                                                                    {formatVES(bsAmount)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {canEdit && (
                                                                    <Link
                                                                        href={`/admin/pos?edit_quote=${quote.id}`}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 border border-neutral-200/70 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all active:scale-95 shadow-2xs"
                                                                        title="Editar Presupuesto en POS"
                                                                    >
                                                                        <PenSquare
                                                                            size={12}
                                                                            strokeWidth={2.2}
                                                                        />
                                                                        <span>Editar</span>
                                                                    </Link>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCopy(quote.id)
                                                                    }
                                                                    className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                                                                        copiedId === quote.id
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                                                            : 'bg-white border-neutral-200/70 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 shadow-2xs'
                                                                    }`}
                                                                    title="Copiar enlace"
                                                                >
                                                                    {copiedId === quote.id ? (
                                                                        <Check
                                                                            size={14}
                                                                            strokeWidth={2.5}
                                                                        />
                                                                    ) : (
                                                                        <Copy
                                                                            size={14}
                                                                            strokeWidth={2}
                                                                        />
                                                                    )}
                                                                </button>
                                                                {canEdit &&
                                                                    !quote.isExpired &&
                                                                    quote.customer_phone && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) =>
                                                                                sendWhatsAppFollowUp(
                                                                                    e,
                                                                                    quote
                                                                                )
                                                                            }
                                                                            className="p-1.5 bg-white text-neutral-500 hover:text-emerald-700 hover:border-emerald-200 border border-neutral-200/70 rounded-lg transition-all active:scale-95 shadow-2xs cursor-pointer"
                                                                            title="Enviar por WhatsApp"
                                                                        >
                                                                            <MessageCircle
                                                                                size={14}
                                                                            />
                                                                        </button>
                                                                    )}
                                                                <a
                                                                    href={getQuoteUrl(quote.id)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1.5 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition-all active:scale-95 inline-flex items-center shadow-2xs"
                                                                    title="Ver Proforma"
                                                                >
                                                                    <ArrowUpRight
                                                                        size={14}
                                                                        strokeWidth={2.5}
                                                                    />
                                                                </a>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* BOTÓN CARGAR MÁS */}
                            {hasMore && !searchTerm && filterTab === 'all' && (
                                <div className="flex justify-center pt-6 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextPage = page + 1
                                            setPage(nextPage)
                                            fetchQuotes(nextPage, false)
                                        }}
                                        disabled={loadingMore}
                                        className="bg-white shadow-xs border border-neutral-200/50 text-neutral-700 font-semibold text-[11px] uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-neutral-50 hover:text-neutral-900 transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
                                    >
                                        {loadingMore ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <ArrowLeft size={14} className="-rotate-90" />
                                        )}
                                        Cargar más presupuestos
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}