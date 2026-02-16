'use client'

import { useState, useRef } from 'react'
import { Loader2, ShoppingBag, Camera, Edit2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'

export default function AdminHeader({ store, title }: { store: any, title?: string }) {
  const router = useRouter()
  const supabase = getSupabase()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    if (file.size > 2 * 1024 * 1024) return Swal.fire('Error', 'Máximo 2MB', 'warning')

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${store.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
      
      await supabase.from('stores').update({ logo_url: publicUrl }).eq('id', store.id)
      
      router.refresh()
      Swal.fire({ icon: 'success', title: 'Logo Actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white' } })
    } catch (error) {
      Swal.fire('Error', 'No se pudo subir', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <header className="px-6 py-6 md:py-8 flex justify-between items-center">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">{title || store.name}</h1>
        {!title && <p className="text-sm font-medium text-gray-400">Panel de Control</p>}
      </div>
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white border-2 border-white shadow-lg flex items-center justify-center overflow-hidden hover:scale-105 transition-all">
          {uploading ? <Loader2 className="animate-spin text-gray-400" /> : store?.logo_url ? <img src={store.logo_url} className="w-full h-full object-contain" alt="Logo" /> : <ShoppingBag size={20} className="text-gray-300" />}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={16} className="text-white"/></div>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-black text-white p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={8}/></div>
      </div>
    </header>
  )
}