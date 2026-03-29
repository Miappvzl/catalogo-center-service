'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { Loader2, ShieldAlert, AlertCircle } from 'lucide-react'

export default function ImpersonateCallback() {
    const router = useRouter()
    const supabase = getSupabase()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const processAuth = async () => {
            try {
                // 1. CAZADOR DE ERRORES: Verificamos si Supabase bloqueó el link de inmediato
                const searchParams = new URLSearchParams(window.location.search)
                const urlError = searchParams.get('error_description') || searchParams.get('error')
                
                if (urlError) {
                    throw new Error(`Supabase rechazó el enlace: ${urlError.replace(/\+/g, ' ')}. Recuerda que los enlaces son de un solo uso. Genera uno nuevo.`)
                }

                // 2. EXTRACCIÓN MANUAL DE TOKENS (Bypass del Flujo Implícito)
                // Leemos directamente lo que hay después del '#' en la URL
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')

                // Si encontramos los tokens en la URL, forzamos la sesión a nivel base de datos local
                if (accessToken && refreshToken) {
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })
                    
                    if (setSessionError) throw setSessionError
                }

                // Damos un tiempo táctico para que las cookies se asienten en el navegador
                await new Promise(resolve => setTimeout(resolve, 1000))

                // 3. VERIFICACIÓN FINAL
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) throw sessionError

                if (session) {
                    // Refrescamos el router de Next.js para que el Middleware reconozca las nuevas cookies
                    router.refresh()
                    setTimeout(() => router.replace('/admin'), 500)
                } else {
                    throw new Error("El token ya fue consumido o la URL no contiene datos de acceso válidos.")
                }
            } catch (e: any) {
                setError(e.message)
            }
        }

        processAuth()
    }, [router, supabase])

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4">
                <div className="bg-white p-8 rounded-3xl border border-red-100 flex flex-col items-center shadow-sm max-w-md text-center">
                    <AlertCircle size={40} className="text-red-500 mb-4" />
                    <h1 className="text-lg font-black text-gray-900 mb-2">Fallo de Infiltración</h1>
                    <p className="text-sm text-gray-500 mb-6">{error}</p>
                    <button onClick={() => window.location.href = '/boss'} className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform w-full">
                        Volver al Control Central
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col items-center shadow-sm">
                <div className="bg-black p-3 rounded-2xl mb-6 relative">
                    <ShieldAlert size={28} className="text-white relative z-10" />
                    <div className="absolute inset-0 bg-black animate-ping rounded-2xl opacity-20"></div>
                </div>
                <h1 className="text-xl font-black text-gray-900 mb-2">Infiltrando Sistema</h1>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8 text-center max-w-50">
                    Inyectando llaves criptográficas...
                </p>
                <Loader2 className="animate-spin text-gray-300" size={24} />
            </div>
        </div>
    )
}