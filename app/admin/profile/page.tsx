'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Copy, Check, ExternalLink, Zap, LogOut, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function ProfilePage() {
    const supabase = getSupabase()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)
    const [authUser, setAuthUser] = useState<any>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push('/login')
            setAuthUser(user)

            const { data: storeData } = await supabase.from('stores').select('*').eq('user_id', user.id).single()
            if (storeData) setStore(storeData)

            setLoading(false)
        }
        fetchProfile()
    }, [supabase, router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
    }

    const storeUrl = store ? `${window.location.protocol}//${store.slug}.${window.location.host.replace('www.', '')}` : ''
    
    // Cálculo de Licencia
    const isTrial = store?.subscription_status === 'trial'
    const endDate = new Date(isTrial ? store.trial_ends_at : store.subscription_ends_at)
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
    const progressPct = isTrial ? Math.min(100, Math.max(0, (daysLeft / 7) * 100)) : 100

    // Iniciales para el avatar
    const initials = store?.name ? store.name.substring(0, 2).toUpperCase() : 'PR'

   return (
        <div className="min-h-screen relative bg-[#F6F6F6] text-gray-900 overflow-hidden z-0 flex flex-col items-center pt-16 md:pt-24 pb-24 px-4 font-sans selection:bg-zinc-200 selection:text-zinc-900">
            
            {/* 1. LUZ CENITAL DISCRETA (Titanium Ambient Glow) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(161,161,170,0.15)_0%,transparent_70%)] pointer-events-none -z-10" />
            
           {/* 2. TEXTURA DE GRANO (Noise Overlay - Ultra Sharp) */}
            <div 
                className="absolute inset-0 pointer-events-none -z-10 mix-blend-multiply opacity-[0.07]" 
                style={{ 
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%221.5%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
                    backgroundSize: '150px',
                    backgroundRepeat: 'repeat'
                }} 
            />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[900px] flex flex-col gap-10"
            >
                {/* 🚀 AVATAR Y CABECERA CENTRADA (Sincronizado con el Header) */}
                <div className="flex flex-col items-center text-center">
                    <div className={`w-24 h-24 rounded-full p-[3px] mb-5 transition-all duration-500 ${!isTrial ? 'bg-gradient-to-tr from-zinc-400 via-zinc-100 to-zinc-300 shadow-[0_8px_30px_rgba(0,0,0,0.08)]' : 'bg-gradient-to-tr from-yellow-400 via-yellow-300 to-yellow-500 shadow-[0_8px_30px_rgba(250,204,21,0.2)]'}`}>
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner">
                            <span className="text-3xl font-black tracking-widest uppercase text-zinc-900">{initials}</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight leading-none mb-2 text-zinc-900">{store?.name || 'Administrador'}</h1>
                    <p className="text-sm font-medium text-zinc-500">{authUser?.email}</p>
                </div>

                {/* 🚀 GRID DE CONTENIDO (Cajas puro blanco de alta legibilidad) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    
                    {/* COLUMNA IZQUIERDA (Info y Plataforma) */}
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
                        
                        {/* BLOQUE IDENTIDAD */}
                        <div className="bg-white rounded-[2rem] p-8 md:p-10 flex flex-col gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Identidad Digital</h2>
                            
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Correo de Acceso</span>
                                <span className="text-lg md:text-xl font-black text-zinc-900">{authUser?.email}</span>
                            </div>
                        </div>

                        {/* BLOQUE PLATAFORMA */}
                        <div className="bg-white rounded-[2rem] p-8 md:p-10 flex flex-col gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plataforma</h2>
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dominio Comercial</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-base md:text-lg font-mono font-bold text-zinc-800 truncate">{storeUrl}</span>
                                        <a href={storeUrl} target="_blank" className="text-zinc-400 hover:text-zinc-900 transition-colors shrink-0"><ExternalLink size={16} strokeWidth={2.5} /></a>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(storeUrl)} 
                                    className="shrink-0 px-6 py-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 border border-transparent hover:border-zinc-200"
                                >
                                    {copied ? <Check size={14} strokeWidth={3} className="text-zinc-900" /> : <Copy size={14} />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* COLUMNA DERECHA (Suscripción Vertical Premium) */}
                    <div className="col-span-1">
                        <div className="bg-white rounded-[2rem] h-full min-h-[360px] relative overflow-hidden flex flex-col p-8 md:p-10 group shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                            
                            {/* 🚀 LÍNEA DE BORDE ORGÁNICA (Titanium Edge Lighting) */}
                            <div className="absolute top-0 inset-x-0 h-[150px] pointer-events-none z-0">
                                
                                {/* 1. EL FILAMENTO SUAVE (Base plata difuminada) */}
                                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-400 to-transparent opacity-60 blur-[1px]" />
                                
                                {/* 2. NÚCLEO CALIENTE (Blanco fundido en el centro) */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.9)] to-transparent blur-[2px] opacity-90" />

                                {/* 3. CAÍDA DE LUZ AMBIENTAL (Resplandor plata que baja hacia el interior) */}
                                <div className="absolute top-0 inset-x-0 h-[130px] bg-[radial-gradient(ellipse_at_top,_rgba(161,161,170,0.15)_0%,_transparent_70%)] opacity-80 group-hover:opacity-100 transition-opacity duration-700" />
                                
                                {/* 4. NÚCLEO INTENSO (Destello concentrado) */}
                                <div className="absolute top-0 left-1/4 right-1/4 h-[70px] bg-[radial-gradient(ellipse_at_top,_rgba(161,161,170,0.3)_0%,_transparent_70%)] opacity-90 group-hover:opacity-100 transition-opacity duration-700" />
                            </div>

                            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8 relative z-10">Licencia</h2>
                            
                            <div className="flex flex-col gap-1 relative z-10 mt-2">
                                <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900">
                                    Plan {isTrial ? 'Piloto' : 'Pro'}
                                </h3>
                                <span className={`text-xs font-bold tracking-wide mt-1 ${isTrial ? 'text-yellow-600' : 'text-zinc-500'}`}>
                                    {daysLeft > 0 ? `${daysLeft} días restantes` : 'Expirado'}
                                </span>
                            </div>

                            {/* 🚀 BARRA DE PROGRESO INDUSTRIAL */}
                            <div className="mt-8 relative z-10">
                                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isTrial ? 'bg-gradient-to-r from-yellow-300 to-yellow-500' : 'bg-gradient-to-r from-zinc-300 to-zinc-600'}`}
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mt-auto pt-10 relative z-10">
                                <a href="/subscription" target="_blank" className="w-full py-4 bg-zinc-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-[0_4px_15px_rgba(0,0,0,0.1)] active:scale-95 flex items-center justify-center gap-2 border border-zinc-800">
                                    <Zap size={14} className={isTrial ? "text-yellow-400" : "text-zinc-400"} fill="currentColor" /> Renovar
                                </a>
                            </div>
                        </div>
                    </div>

                </div>

                {/* LOGOUT (Alineado con el Clean Look) */}
                <div className="flex justify-center mt-4">
                    <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 text-zinc-400 hover:text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors active:scale-95">
                        <LogOut size={14} strokeWidth={2.5} /> Cerrar Sesión del Dispositivo
                    </button>
                </div>

            </motion.div>
        </div>
    )
}