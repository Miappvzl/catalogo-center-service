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
    // 🚀 Lógica corregida: Detectamos primero si la venta se cayó
    if (status === 'cancelled') {
        return <span className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700 shrink-0"><XCircle size={12} strokeWidth={3} /> Cancelado</span>
    }
    // Si no es cotización y no está cancelada, entonces fue una venta exitosa
    if (status !== 'quote') {
        return <span className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 shrink-0"><CheckCircle2 size={12} strokeWidth={3} /> Convertido</span>
    }
    if (isExpired) {
        return <span className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold uppercase tracking-wide bg-orange-50 text-orange-700 shrink-0"><AlertCircle size={12} strokeWidth={3} /> Vencido</span>
    }
    return <span className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold uppercase tracking-wide bg-gray-900 text-white shrink-0"><Clock size={12} strokeWidth={3} /> Activo</span>
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

                {/* KPI CARDS (CRM STYLE) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col justify-between border border-transparent hover:border-gray-200">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={20} strokeWidth={2.5}/></div>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full uppercase tracking-wide">En Seguimiento</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-3xl font-black tracking-tighter text-gray-900">${kpiStats.activeAmount.toFixed(2)}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Potencial de Venta</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col justify-between border border-transparent hover:border-gray-200">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20} strokeWidth={2.5}/></div>
                        </div>
                        <div className="mt-4">
                            <p className="text-3xl font-black tracking-tighter text-gray-900">{kpiStats.conversionRate.toFixed(1)}%</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Tasa de Cierre</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col justify-between border border-transparent hover:border-gray-200">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Clock size={20} strokeWidth={2.5}/></div>
                        </div>
                        <div className="mt-4">
                            <p className="text-3xl font-black tracking-tighter text-gray-900">{kpiStats.expiringSoon}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Presupuestos Activos</p>
                        </div>
                    </div>
                </div>

                {/* FILTROS Y BUSCADOR */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center w-full">
                    <div className="flex bg-white p-1 rounded-[var(--radius-btn)] shrink-0 w-full overflow-x-auto no-scrollbar lg:w-auto max-w-full  border border-gray-100">
                        {['all', 'active', 'converted', 'expired'].map(status => (
                            <button
                                key={status} onClick={() => setFilterStatus(status as any)}
                                className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${filterStatus === status ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-[#f6f6f6] active:bg-[#e5e5e5]'}`}
                            >
                                {status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : status === 'converted' ? 'Convertidos' : 'Vencidos'}
                            </button>
                        ))}
                    </div>

                    <div className="relative group w-full lg:w-80 shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente o cotización..." className="w-full bg-white   border border-gray-100  focus:border-black  rounded-[var(--radius-btn)] pl-11 pr-4 py-3 text-sm font-medium outline-none transition-all" />
                    </div>
                </div>

                {/* TABLA DE CRM DE VENTAS */}
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-gray-300 mx-auto" size={32} /></div>
                ) : filteredQuotes.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400"><FileText size={24} /></div>
                        <p className="text-gray-500 font-bold text-sm">No hay presupuestos para mostrar.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl overflow-hidden w-full border border-gray-100">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white border-b-2 border-[#f6f6f6] text-[10px] uppercase tracking-widest text-gray-500">
                                    <tr>
                                        <th className="px-6 py-5 font-bold">Doc #</th>
                                        <th className="px-6 py-5 font-bold">Cliente / Prospecto</th>
                                        <th className="px-6 py-5 font-bold">Estado</th>
                                        <th className="px-6 py-5 font-bold text-right">Potencial (USD)</th>
                                        <th className="px-6 py-5 font-bold text-center">Seguimiento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredQuotes.map(quote => {
                                        const isExpired = quote.expires_at ? new Date(quote.expires_at).getTime() < new Date().getTime() : false;
                                        const isConverted = quote.status !== 'quote' && quote.status !== 'cancelled';
                                        
                                        return (
                                        <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-black text-gray-900">#{quote.order_number}</span>
                                                <p className="text-[10px] font-mono text-gray-400 mt-1">{new Date(quote.created_at).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <span className="font-bold text-gray-900 block">{quote.customer_name}</span>
                                                {quote.customer_phone && <span className="text-xs font-mono text-gray-500 mt-0.5">{quote.customer_phone}</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <QuoteStatusBadge status={quote.status} isExpired={isExpired} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <p className={`font-black text-lg ${isConverted ? 'text-emerald-600' : 'text-gray-900'}`}>${Number(quote.total_usd).toFixed(2)}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* BOTÓN COPIAR */}
                                                    <button onClick={(e) => handleCopy(e, quote.id)} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-black transition-all active:scale-95" title="Copiar Link">
                                                        {copiedId === quote.id ? <Check size={16} className="text-emerald-600"/> : <Copy size={16}/>}
                                                    </button>
                                                    
                                                    {/* BOTÓN WHATSAPP (Solo si no está convertido y tiene teléfono) */}
                                                    {!isConverted && quote.customer_phone && (
                                                        <button onClick={(e) => sendWhatsAppFollowUp(e, quote)} className="flex items-center gap-1.5 px-4 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-xl text-xs font-bold transition-all active:scale-95">
                                                            <MessageCircle size={16} /> <span>Recordar</span>
                                                        </button>
                                                    )}

                                                    {/* ABRIR ENLACE */}
                                                    <a href={getQuoteLink(quote.id)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-black hover:border-black hover:text-white transition-all active:scale-95" title="Ver Documento">
                                                        <ArrowUpRight size={16}/>
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}