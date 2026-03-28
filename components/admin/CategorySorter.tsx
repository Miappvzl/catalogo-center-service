'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Save, Loader2, ListOrdered } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { revalidateStoreCache } from '@/app/admin/actions' // 🚀 NUEVO

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
                // 1. Tipamos explícitamente el map y el filter como string[]
                const rawCategories = products.map((p: any) => {
                    const trimmed = (p.category || '').trim().toLowerCase()
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
                }).filter(Boolean) as string[]

                // 2. Tipamos el Set
                const uniqueCats: string[] = Array.from(new Set(rawCategories))
                
                // 3. Tipamos las variables 'a' y 'b' dentro del sort
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
            // 🚀 MATA LA CACHÉ DE NEXT.JS EN SEGUNDO PLANO
            await revalidateStoreCache() 
        }
        
        setSaving(false)
        
        if (error) {
            Swal.fire('Error', 'No se pudo guardar el orden', 'error')
        } else {
            setIsDirty(false)
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'bg-black text-white rounded-[var(--radius-card)] text-sm font-bold' } })
            Toast.fire({ icon: 'success', title: 'Orden guardado' })
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
    if (categories.length <= 1) return null // No mostramos nada si solo hay 1 categoría

    return (
        <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive w-full">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><ListOrdered size={20} className="text-black"/> Orden de Categorías</h3>
                    <p className="text-sm text-gray-500 mt-1">Elige qué colecciones ven primero tus clientes.</p>
                </div>
                {isDirty && (
                    <button onClick={handleSave} disabled={saving} className="bg-black text-white px-4 py-2.5 rounded-[var(--radius-btn)] text-xs font-bold shadow-subtle hover:bg-gray-800 active:scale-95 flex gap-2 items-center transition-all shrink-0">
                        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} <span className="hidden sm:inline">Guardar</span>
                    </button>
                )}
            </div>
            
            <div className="space-y-2">
                {categories.map((cat, idx) => (
                    <div key={cat} className="flex items-center justify-between bg-[#f6f6f6] p-3 rounded-[var(--radius-btn)] border border-transparent hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-bold bg-black/90 border border-transparent text-white w-6 h-6 flex items-center justify-center rounded-full ">{idx + 1}</span>
                            <span className="font-bold text-sm text-gray-900">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-2 rounded-md bg-white hover:bg-white text-black hover:text-black disabled:opacity-30 transition-all  border border-black/20 hover:border-gray-200 active:scale-95"><ArrowUp size={16}/></button>
                            <button onClick={() => moveDown(idx)} disabled={idx === categories.length - 1} className="p-2 rounded-md bg-white hover:bg-white text-black hover:text-black disabled:opacity-30 transition-all border border-black/20 hover:border-gray-200 active:scale-95"><ArrowDown size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}