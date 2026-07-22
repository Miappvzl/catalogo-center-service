'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Save, Loader2, ListOrdered, AlertCircle } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { revalidateStoreCache } from '@/app/admin/actions'

export default function CategorySorter({ storeId, initialOrder = [] }: { storeId: string, initialOrder?: string[] }) {
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const supabase = getSupabase()

    useEffect(() => {
        const loadCategories = async () => {
            const { data: products } = await supabase.from('products').select('category').eq('store_id', storeId)
            if (products) {
                const rawCategories = products.map((p: any) => {
                    const trimmed = (p.category || '').trim().toLowerCase()
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
                }).filter(Boolean) as string[]

                const uniqueCats: string[] = Array.from(new Set(rawCategories))
                
                const sorted: string[] = [...uniqueCats].sort((a: string, b: string) => {
                    const idxA = initialOrder.indexOf(a)
                    const idxB = initialOrder.indexOf(b)
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB
                    if (idxA !== -1) return -1
                    if (idxB !== -1) return 1
                    return a.localeCompare(b)
                })
                
                setCategories(sorted)
            }
            setLoading(false)
        }
        loadCategories()
    }, [storeId, supabase, initialOrder])
       
    const moveUp = (index: number) => {
        if (index === 0) return
        const newCats = [...categories]
        const temp = newCats[index]
        newCats[index] = newCats[index - 1]
        newCats[index - 1] = temp
        setCategories(newCats)
        setIsDirty(true)
    }

    const moveDown = (index: number) => {
        if (index === categories.length - 1) return
        const newCats = [...categories]
        const temp = newCats[index]
        newCats[index] = newCats[index + 1]
        newCats[index + 1] = temp
        setCategories(newCats)
        setIsDirty(true)
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase.from('stores').update({ categories_order: categories }).eq('id', storeId)
        
        if (!error) {
            await revalidateStoreCache() 
        }
        
        setSaving(false)
        
        if (error) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudo guardar la alineación.',
                icon: 'error',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            })
        } else {
            setIsDirty(false)
            const Toast = Swal.mixin({ 
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 2000, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
            })
            Toast.fire({ icon: 'success', title: 'Orden de visualización guardado' })
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-neutral-300" size={20} /></div>
    if (categories.length <= 1) return null 

    return (
        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] w-full space-y-6">
            
            {/* Cabecera con botón dinámico */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-neutral-900">
                        <ListOrdered size={18} className="text-neutral-500" />
                        <h3 className="text-base font-bold tracking-tight">Orden de Categorías</h3>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Establezca el orden de prioridad de las pestañas de navegación en el catálogo público.</p>
                </div>
                
                {isDirty && (
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="bg-neutral-950 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs flex gap-1.5 items-center justify-center transition-all shrink-0 active:scale-[0.98]"
                    >
                        {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} 
                        <span>Confirmar Prioridad</span>
                    </button>
                )}
            </div>
            
            {/* Lista interactiva */}
            <div className="space-y-2">
                {categories.map((cat, idx) => (
                    <div key={cat} className="flex items-center justify-between bg-neutral-50/50 p-3 rounded-lg border border-neutral-200/50 hover:border-neutral-300/40 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono font-bold bg-white border border-neutral-200/50 text-neutral-600 w-6 h-6 flex items-center justify-center rounded-md shadow-xs">
                                {idx + 1}
                            </span>
                            <span className="font-semibold text-xs text-neutral-800">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button 
                                onClick={() => moveUp(idx)} 
                                disabled={idx === 0} 
                                className="p-2 rounded-lg bg-white border border-neutral-200/50 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 disabled:opacity-35 transition-all shadow-xs active:scale-[0.97]"
                                title="Mover arriba"
                            >
                                <ArrowUp size={14}/>
                            </button>
                            <button 
                                onClick={() => moveDown(idx)} 
                                disabled={idx === categories.length - 1} 
                                className="p-2 rounded-lg bg-white border border-neutral-200/50 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 disabled:opacity-35 transition-all border border-neutral-200/50 active:scale-[0.97]"
                                title="Mover abajo"
                            >
                                <ArrowDown size={14}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}