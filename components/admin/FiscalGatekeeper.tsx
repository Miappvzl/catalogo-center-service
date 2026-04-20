'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { ShieldCheck, Loader2, CheckCircle2, FileText, Building2, Store } from 'lucide-react'
import Swal from 'sweetalert2'

export default function FiscalGatekeeper({ store }: { store: any }) {
    const router = useRouter()
    const supabase = getSupabase()
    
    // Si ya aceptó, no renderizamos nada (Evita parpadeos / Hydration mismatches)
    if (store.terms_accepted) return null

    const [selectedProfile, setSelectedProfile] = useState<'informal' | 'ordinary' | 'special'>(store.fiscal_profile || 'informal')
    const [termsChecked, setTermsChecked] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!termsChecked) return Swal.fire('Términos Requeridos', 'Debes confirmar tu responsabilidad legal para continuar.', 'warning')
        
        setSaving(true)
        const { error } = await supabase.from('stores').update({ 
            terms_accepted: true, 
            fiscal_profile: selectedProfile 
        }).eq('id', store.id)

        if (error) {
            Swal.fire('Error', 'No pudimos guardar la configuración.', 'error')
            setSaving(false)
        } else {
            // Recargamos la página desde el servidor para destruir el Gatekeeper
            router.refresh() 
        }
    }

    const profiles = [
        { id: 'informal', title: 'No Formalizado', desc: 'Emprendedores sin RIF jurídico. Facturación sin IVA. (Genera Órdenes de Pedido).', icon: Store },
        { id: 'ordinary', title: 'Contribuyente Ordinario', desc: 'Empresas con RIF. Cobro de 16% de IVA obligatorio al comprador.', icon: FileText },
        { id: 'special', title: 'Contribuyente Especial', desc: 'Grandes empresas. IVA obligatorio + Módulo de retenciones activado.', icon: Building2 },
    ]

    return (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-2xl border border-black/5 shadow-2xl p-8 md:p-12 animate-in fade-in zoom-in-95 duration-500 my-auto">
                
                <div className="w-16 h-16 bg-zinc-50 border border-black/5 rounded-2xl flex items-center justify-center mb-6 text-zinc-900">
                    <ShieldCheck size={32} strokeWidth={2.5} />
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight leading-none mb-3">
                    Actualización Legal Requerida
                </h1>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-8">
                    Para proteger tu negocio ante normativas tributarias (Providencia N° 0071), hemos actualizado el motor de Preziso. Selecciona el perfil fiscal que corresponde a tu empresa.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {profiles.map(p => {
                        const isSelected = selectedProfile === p.id
                        return (
                            <div 
                                key={p.id} 
                                onClick={() => setSelectedProfile(p.id as any)}
                                className={`cursor-pointer p-5 rounded-xl border transition-all duration-300 active:scale-95 flex flex-col gap-3 ${isSelected ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-zinc-50 border-black/5 hover:bg-zinc-100 text-zinc-900'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <p.icon size={24} className={isSelected ? 'text-zinc-300' : 'text-zinc-400'} strokeWidth={2} />
                                    {isSelected && <CheckCircle2 size={18} className="text-white" />}
                                </div>
                                <div>
                                    <h3 className={`font-black text-sm tracking-tight ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{p.title}</h3>
                                    <p className={`text-[10px] leading-relaxed mt-1.5 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="bg-zinc-50 border border-black/5 p-5 rounded-xl mb-8">
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-0.5">
                            <input type="checkbox" className="peer sr-only" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} />
                            <div className="w-5 h-5 rounded border-2 border-zinc-300 peer-checked:bg-zinc-900 peer-checked:border-zinc-900 transition-colors flex items-center justify-center">
                                <CheckCircle2 size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        <div className="text-xs text-zinc-600 leading-relaxed font-medium">
                            Confirmo que PREZISO es un software administrativo y <strong className="text-zinc-900 font-bold">NO</strong> una máquina fiscal homologada. Entiendo que la emisión de facturas definitivas ante el SENIAT es responsabilidad única y exclusiva de mi comercio.
                        </div>
                    </label>
                </div>

                <button 
                    onClick={handleSave} 
                    disabled={!termsChecked || saving}
                    className="w-full py-4 bg-zinc-900 hover:bg-black text-white font-bold tracking-widest uppercase text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : 'Aceptar y Continuar'}
                </button>
            </div>
        </div>
    )
}