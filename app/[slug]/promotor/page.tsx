// Archivo: app/[slug]/promotor/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { useParams } from 'next/navigation'
import { Wallet, Copy, Check, ArrowRight, Loader2, DollarSign, HandCoins, Building2, Smartphone } from 'lucide-react'
import Swal from 'sweetalert2'
import { loginOrRegisterAffiliate, getAffiliateDashboard, savePaymentDetails } from './actions'
import { motion } from "framer-motion";


export default function PromotorPortal() {
    const params = useParams()
    const slug = params.slug as string
    
    // Estados Globales
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)
    const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login')
    const [isActionLoading, setIsActionLoading] = useState(false)

    // Datos del Promotor
    const [phone, setPhone] = useState('')
    const [name, setName] = useState('')
    const [promoCode, setPromoCode] = useState('')
    const [affiliate, setAffiliate] = useState<any>(null)
    
    // Datos Financieros
    const [stats, setStats] = useState({ pending: 0, available: 0, paid: 0 })
    const [history, setHistory] = useState<any[]>([])
    const [paymentInfo, setPaymentInfo] = useState('')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchStore = async () => {
            const supabase = getSupabase()
            const { data } = await supabase
                .from('stores')
                .select('id, name, logo_url, affiliate_config')
                .eq('slug', slug)
                .single()
                
            if (data) setStore(data)
            setLoading(false)
        }
        fetchStore()
    }, [slug])

    const handleLoginNext = async () => {
        if (phone.length < 10) return Swal.fire({ icon: 'warning', title: 'Teléfono inválido', text: 'Ingresa un número de WhatsApp válido.', confirmButtonColor: '#000' })
        
        setIsActionLoading(true)
        const res = await loginOrRegisterAffiliate(store.id, phone)
        
        if (!res.success) {
            Swal.fire('Error', res.error, 'error')
        } else if (res.isNew) {
            setView('register') // Pasa a la pantalla de pedir nombre y código
        } else {
            setAffiliate(res.affiliate)
            setPaymentInfo(res.affiliate.payment_details?.instructions || '')
            await loadDashboard(res.affiliate.id)
            setView('dashboard')
        }
        setIsActionLoading(false)
    }

    const handleRegister = async () => {
        if (!name || !promoCode) return Swal.fire({ icon: 'warning', title: 'Faltan datos', confirmButtonColor: '#000' })
        
        setIsActionLoading(true)
        const res = await loginOrRegisterAffiliate(store.id, phone, name, promoCode)
        
        if (!res.success) {
            Swal.fire({ icon: 'error', title: 'Oops', text: res.error, confirmButtonColor: '#000' })
        } else {
            setAffiliate(res.affiliate)
            await loadDashboard(res.affiliate.id)
            setView('dashboard')
            Swal.fire({ icon: 'success', title: '¡Portal Creado!', text: 'Ya puedes empezar a compartir tu enlace.', confirmButtonColor: '#000' })
        }
        setIsActionLoading(false)
    }

   const loadDashboard = async (id: string) => {
        const res = await getAffiliateDashboard(id)
        if (res.success) {
            // Usamos || (OR) para darle un valor por defecto y calmar a TypeScript
            setStats(res.stats || { pending: 0, available: 0, paid: 0 })
            setHistory(res.history || [])
        }
    }

    const handleSavePayment = async () => {
        setIsActionLoading(true)
        const res = await savePaymentDetails(affiliate.id, { instructions: paymentInfo })
        setIsActionLoading(false)
        if (res.success) {
            Swal.fire({ icon: 'success', title: 'Datos Guardados', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
        } else {
            Swal.fire('Error', 'No se pudieron guardar los datos', 'error')
        }
    }

    const [shareLink, setShareLink] = useState('')
    useEffect(() => {
        if (affiliate?.promo_code) {
            // Lee dinámicamente si estás en localhost o en preziso.shop
            setShareLink(`${window.location.origin}?ref=${affiliate.promo_code}`)
        }
    }, [affiliate])
    const copyLink = () => {
        navigator.clipboard.writeText(shareLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>

    if (!store?.affiliate_config?.active) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4"><Wallet className="text-gray-400" /></div>
                <h1 className="text-xl font-black text-gray-900 mb-2">Programa Inactivo</h1>
                <p className="text-sm text-gray-500 max-w-xs">Actualmente {store?.name} no tiene activo su programa de promotores.</p>
            </div>
        )
    }

    // 1. Sanitización estricta de datos (Evita el NaN%)
const safePending = Number(stats?.pending) || 0;
const safeAvailable = Number(stats?.available) || 0;
const totalBalance = safePending + safeAvailable;

const GOAL = 10; // Meta de retiro

// 2. Cálculo limpio, limitado a 100 y redondeado a 2 decimales para un DOM ligero
const progressPercentage = Math.max(0, Math.min((totalBalance / GOAL) * 100, 100)).toFixed(2);

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 selection:bg-black selection:text-white flex flex-col">
            
            {/* Header Simple */}
            <header className="bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <HandCoins size={16} className="text-black" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tight leading-none">Portal de Promotores</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{store.name}</p>
                    </div>
                </div>
            </header>

            {/* Contenedor Principal */}
            <main className="flex-1 flex flex-col items-center p-6 md:p-10 w-full max-w-2xl mx-auto">
                
                {/* VISTA 1: LOGIN (Fricción Cero) */}
                {view === 'login' && (
                    <div className="w-full max-w-sm mt-10 animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black mb-2">Gana comisiones</h2>
                            <p className="text-sm text-gray-500 font-medium">Ingresa tu número de WhatsApp para acceder a tu dinero o crear tu código.</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">WhatsApp</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="tel" 
                                        placeholder="Ej: 04121234567" 
                                        value={phone} 
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-[#F8F9FA] border border-transparent focus:border-black focus:bg-white rounded-xl pl-10 pr-4 py-3.5 text-sm font-bold outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleLoginNext} 
                                disabled={isActionLoading || phone.length < 10}
                                className="w-full bg-black text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Continuar'} <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* VISTA 2: REGISTRO (Alias) */}
                {view === 'register' && (
                    <div className="w-full max-w-sm mt-10 animate-in fade-in slide-in-from-right-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black mb-2">Crea tu Identidad</h2>
                            <p className="text-sm text-gray-500 font-medium">Este será el código que le darás a tus amigos para que obtengan descuento.</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tu Nombre</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Pablo Pérez" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-[#F8F9FA] border border-transparent focus:border-black focus:bg-white rounded-xl px-4 py-3.5 text-sm font-bold outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Código Deseado (Sin espacios)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: PABLO10" 
                                    value={promoCode} 
                                    maxLength={15}
                                    onChange={e => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    className="w-full bg-[#F8F9FA] border border-transparent focus:border-black focus:bg-white rounded-xl px-4 py-3.5 text-sm font-black tracking-widest outline-none transition-all"
                                />
                            </div>
                            <button 
                                onClick={handleRegister} 
                                disabled={isActionLoading || !name || !promoCode}
                                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 mt-2"
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Crear mi Enlace'}
                            </button>
                        </div>
                    </div>
                )}

                {/* VISTA 3: EL DASHBOARD FINANCIERO */}
                {view === 'dashboard' && affiliate && (
                    
                    
                    <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 space-y-6">
                        
                        <div className="mb-2">
                            <h2 className="text-2xl font-black">Hola, {affiliate.name.split(' ')[0]} 👋</h2>
                            <p className="text-sm text-gray-500 font-medium">Ganas el {store.affiliate_config.global_commission_pct}% de todo lo que vendas.</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100  mt-4">
    <div className="flex justify-between items-end mb-3">
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Meta de retiro</p>
            <p className="font-black text-gray-900">${GOAL.toFixed(2)}</p>
        </div>
        <p className="text-xs font-bold text-emerald-600">
            {totalBalance >= GOAL 
                ? '¡Listo para cobrar!' 
                : `Faltan $${(GOAL - totalBalance).toFixed(2)}`}
        </p>
    </div>
    
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
            // 3. Usamos framer-motion (que ya veo que importaste) para forzar 
            // la animación de 0 al target sin importar el ciclo de vida de React
            initial={{ width: "0%" }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-emerald-500"
        />
    </div>
    
    {totalBalance < GOAL && (
        <p className="text-[10px] font-medium text-gray-500 mt-3 leading-relaxed">
            * Todo tu saldo (En Tránsito + Listo para Cobrar) suma para alcanzar esta meta.
        </p>
    )}
</div>

                        {/* Link Compartible (El arma viral) */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 ">
                            <div className="min-w-0 w-full">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Tu Enlace de Ventas</p>
                                <p className="font-mono text-sm text-gray-900 truncate bg-[#F8F9FA] py-2 px-3 rounded-lg border border-gray-100">{shareLink}</p>
                            </div>
                            <button onClick={copyLink} className="w-full sm:w-auto bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shrink-0">
                                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />} Copiar
                            </button>
                        </div>

                        {/* KPIs Financieros (Bento Grid) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center min-h-[120px]">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign size={12}/> Listo para Cobrar</p>
                                <p className="text-3xl font-black text-emerald-900 leading-none">${stats.available.toFixed(2)}</p>
                                <p className="text-xs text-emerald-700 font-medium mt-1">Ventas completadas</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-center min-h-[120px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">En Tránsito</p>
                                <p className="text-3xl font-black text-gray-900 leading-none">${stats.pending.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 font-medium mt-1">A la espera de pago</p>
                            </div>
                            <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-center min-h-[120px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Retirado (Histórico)</p>
                                <p className="text-2xl md:text-3xl font-black text-gray-900 leading-none">${stats.paid.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Configuración de Pago */}
                        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100  mt-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 size={20} className="text-gray-400" />
                                <h3 className="font-black text-lg">¿Dónde te depositamos?</h3>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed">
                                Cuando tengas saldo disponible, la tienda te transferirá a esta cuenta. Puedes dejar los datos de tu <b>PagoMóvil</b>, <b>Binance Pay</b> o cuenta bancaria.
                            </p>
                            <textarea 
                                rows={3}
                                placeholder="Ej: PagoMóvil: Banco Banesco, CI 28.000.000, Celular: 0412-1234567"
                                value={paymentInfo}
                                onChange={e => setPaymentInfo(e.target.value)}
                                className="w-full bg-[#F8F9FA] border border-transparent focus:border-black focus:bg-white rounded-xl p-4 text-sm font-medium outline-none transition-all resize-none mb-4"
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleSavePayment} 
                                    disabled={isActionLoading || !paymentInfo}
                                    className="bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Datos'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
            </main>
        </div>
    )
}