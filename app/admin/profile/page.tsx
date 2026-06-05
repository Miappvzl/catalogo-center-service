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
        <div className="min-h-screen relative bg-[#F6F6F6] text-gray-900 overflow-hidden z-0 flex flex-col items-center pt-16 md:pt-24 pb-24 px-4 font-sans selection:bg-[blueviolet]/20 selection:text-[blueviolet]">
            
            {/* 1. LUZ CENITAL DISCRETA (Top Radial Glow) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(138,43,226,0.06)_0%,transparent_70%)] pointer-events-none -z-10" />
            
           {/* 2. TEXTURA DE GRANO (Noise Overlay - Ultra Sharp) */}
            <div 
                className="absolute inset-0 pointer-events-none -z-10 mix-blend-multiply opacity-[0.07]" 
                style={{ 
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%221.5%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
                    backgroundSize: '150px', // 🚀 PREVIENE EL ESTIRAMIENTO (BORROSO)
                    backgroundRepeat: 'repeat' // 🚀 FUERZA EL TILING NÍTIDO
                }} 
            />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[900px] flex flex-col gap-10"
            >
                {/* 🚀 AVATAR Y CABECERA CENTRADA */}
                <div className="flex flex-col items-center text-center">
                    <div className={`w-24 h-24 rounded-full p-[3px] mb-5 transition-all ${!isTrial ? 'bg-gradient-to-r from-[#4f37d3] to-[#e5e5e5] shadow-[0_0_20px_rgba(138,43,226,0.2)]' : 'bg-black'}`}>
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                            <span className="text-3xl font-black tracking-tighter text-gray-900">{initials}</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight leading-none mb-2">{store?.name || 'Administrador'}</h1>
                    <p className="text-sm font-medium text-gray-500">{authUser?.email}</p>
                </div>

                {/* 🚀 GRID DE CONTENIDO (Sin bordes, sin sombras, cajas puro blanco) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    
                    {/* COLUMNA IZQUIERDA (Info y Plataforma) */}
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
                        
                        {/* BLOQUE IDENTIDAD */}
                        <div className="bg-white rounded-[2rem] p-8 md:p-10 flex flex-col gap-6">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identidad Digital</h2>
                            
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Correo de Acceso</span>
                                <span className="text-lg md:text-xl font-black text-gray-900">{authUser?.email}</span>
                            </div>
                        </div>

                        {/* BLOQUE PLATAFORMA */}
                        <div className="bg-white rounded-[2rem] p-8 md:p-10 flex flex-col gap-6">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plataforma</h2>
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dominio Comercial</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-base md:text-lg font-mono font-bold text-gray-800 truncate">{storeUrl}</span>
                                        <a href={storeUrl} target="_blank" className="text-gray-400 hover:text-black transition-colors shrink-0"><ExternalLink size={16} /></a>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(storeUrl)} 
                                    className="shrink-0 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {copied ? <Check size={14} className="text-[#4f37d3]" /> : <Copy size={14} />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* COLUMNA DERECHA (Suscripción Vertical Premium) */}
                    <div className="col-span-1">
                        <div className="bg-white rounded-[2rem] h-full min-h-[360px] relative overflow-hidden flex flex-col p-8 md:p-10 group">
                            
 {/* 🚀 LÍNEA DE BORDE ORGÁNICA (Edge Lighting con efecto Bloom) */}
    <div className="absolute top-0 inset-x-0 h-[150px] pointer-events-none z-0">
        
        {/* 1. EL FILAMENTO SUAVE (Base púrpura difuminada para matar el borde duro) */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#4f37d3] to-transparent opacity-80 blur-[1px]" />
        
        {/* 2. NÚCLEO CALIENTE (Punto de máxima energía, más claro/blanco, fundido en el centro) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.7)] to-transparent blur-[2px] opacity-80" />

        {/* 3. CAÍDA DE LUZ AMBIENTAL (El resplandor ancho que baja hacia el interior) */}
        <div className="absolute top-0 inset-x-0 h-[130px] bg-[radial-gradient(ellipse_at_top,_rgba(79,55,211,0.25)_0%,_transparent_70%)] opacity-80 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* 4. NÚCLEO INTENSO (El destello concentrado justo debajo de la línea central) */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[70px] bg-[radial-gradient(ellipse_at_top,_rgba(79,55,211,0.6)_0%,_transparent_70%)] opacity-90 group-hover:opacity-100 transition-opacity duration-700" />
    </div>

    {/* Es crucial mantener relative y z-10 en el contenido para que el resplandor quede de fondo */}
    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8 relative z-10">Licencia</h2>
    
    <div className="flex flex-col gap-1 relative z-10 mt-2">
        <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-gray-900">
            Plan {isTrial ? 'Piloto' : 'Pro'}
        </h3>
        <span className="text-xs font-bold text-[#4f37d3] tracking-wide mt-1">
            {daysLeft > 0 ? `${daysLeft} días restantes` : 'Expirado'}
        </span>
    </div>

    {/* 🚀 BARRA DE PROGRESO INTEGRADA */}
    <div className="mt-8 relative z-10">
        <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
            <div 
                className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-[rgba(138,43,226,0.3)] to-[#4f37d3]" 
                style={{ width: `${progressPct}%` }}
            />
        </div>
    </div>

    <div className="mt-auto pt-10 relative z-10">
        <a href="/subscription" target="_blank" className="w-full py-4 bg-black text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95 flex items-center justify-center gap-2">
           <Zap size={14} className="text-[#4f37d3]" /> Renovar
        </a>
       
    </div>
</div>
                    </div>

                </div>

                {/* LOGOUT (Desconectado de las cajas) */}
                <div className="flex justify-center mt-4">
                    <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors active:scale-95">
                        <LogOut size={14} /> Cerrar Sesión del Dispositivo
                    </button>
                </div>

            </motion.div>
        </div>
    )
}