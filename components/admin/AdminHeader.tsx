'use client'

import { useState, useRef } from 'react'
import { Loader2, ShoppingBag, Edit2, Copy, Check, Store } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Swal from 'sweetalert2'

export default function AdminHeader({ store, title }: { store: any, title?: string }) {
  const router = useRouter()
  const supabase = getSupabase()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)

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
      
      Swal.fire({
        icon: 'success', title: 'Logo Actualizado', toast: true, position: 'top-end',
        showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl' }
      })
    } catch (error) {
      Swal.fire('Error', 'No se pudo subir', 'error')
    } finally {
      setUploading(false)
    }
  }

  const copyLink = () => {
    if (!store?.slug) return
    const url = `${window.location.origin}/${store.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="px-4 md:px-8 py-6 md:py-8 flex justify-between items-center bg-transparent border-b border-gray-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">{title || store?.name || 'Cargando...'}</h1>
        {!title && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Panel de Control</p>}
      </div>

      <div className="flex items-center gap-3">
        {store?.slug && (
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={copyLink} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-all">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <Link href={`/${store.slug}`} target="_blank" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-all">
              <Store size={16} />
            </Link>
          </div>
        )}

        {/* EDITOR DE LOGO (Con UX Táctil Evidente) */}
        <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
          
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden transition-colors group-hover:border-black">
            {uploading ? (
              <Loader2 className="animate-spin text-gray-400" />
            ) : store?.logo_url ? (
              <img src={store.logo_url} className="w-full h-full object-contain" alt="Logo" />
            ) : (
              <ShoppingBag size={20} className="text-gray-300" />
            )}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* BADGE PERMANENTE DE EDICIÓN */}
          <div className="absolute -bottom-1 -right-1 bg-white border border-gray-200 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center group-hover:text-black group-hover:border-black transition-all z-10">
            <Edit2 size={10} strokeWidth={2.5}/>
          </div>
        </div>

      </div>
    </header>
  )
}