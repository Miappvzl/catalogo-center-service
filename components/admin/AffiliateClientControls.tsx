'use client'

import { useState } from 'react'
import { Copy, Check, Loader2, Rocket, Save } from 'lucide-react'
import { toast } from 'sonner'
import { activateAffiliateProgram, updatePaymentDetails } from '@/app/actions/affiliate-actions'

interface AffiliateClientControlsProps {
  action: 'activate' | 'copy' | 'update_payment'
  storeSlug?: string
  payload?: any
}

export default function AffiliateClientControls({ action, storeSlug, payload }: AffiliateClientControlsProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Estados para el formulario de Pago Móvil
  const [bank, setBank] = useState(payload?.bank || '')
  const [dni, setDni] = useState(payload?.dni || '')
  const [phone, setPhone] = useState(payload?.phone || '')

  const handleActivate = async () => {
    if (!storeSlug) return
    setLoading(true)
    try {
      await activateAffiliateProgram(storeSlug)
      toast.success('¡Programa de afiliados activado!')
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al activar el programa.')
      setLoading(false) // Solo apagamos el loading si hay error, si hay éxito el server component se re-renderiza
    }
  }

  const handleCopy = () => {
    if (!payload) return
    navigator.clipboard.writeText(payload)
    setCopied(true)
    toast.success('Enlace copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updatePaymentDetails({ bank, dni, phone })
      toast.success('Datos de pago actualizados correctamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar los datos')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER: BOTÓN DE ACTIVACIÓN
  // ---------------------------------------------------------------------------
  if (action === 'activate') {
    return (
      <button
        onClick={handleActivate}
        disabled={loading}
        className="bg-black text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 active:scale-95 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
        {loading ? 'Activando...' : 'Activar mi enlace ahora'}
      </button>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: BOTÓN DE COPIAR
  // ---------------------------------------------------------------------------
  if (action === 'copy') {
    return (
      <button
        onClick={handleCopy}
        className="bg-white border border-gray-200 text-black px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 hover:border-black active:scale-95 transition-all shadow-sm shrink-0"
      >
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: FORMULARIO DE PAGO MÓVIL
  // ---------------------------------------------------------------------------
  if (action === 'update_payment') {
    return (
      <form onSubmit={handleUpdatePayment} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
            Banco
          </label>
          <input
            type="text"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="Ej: Banesco (0134)"
            required
            className="w-full bg-gray-50 border border-gray-100 focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3 text-sm font-medium text-black outline-none transition-all placeholder:text-gray-300"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
              Cédula / RIF
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value.toUpperCase())}
              placeholder="Ej: V12345678"
              required
              className="w-full bg-gray-50 border border-gray-100 focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3 text-sm font-medium text-black outline-none transition-all placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
              Teléfono
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Ej: 04141234567"
              required
              className="w-full bg-gray-50 border border-gray-100 focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3 text-sm font-medium text-black outline-none transition-all placeholder:text-gray-300"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !bank || !dni || !phone}
          className="w-full mt-2 bg-black text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 active:scale-[0.98] transition-all shadow-[0_8px_20px_rgb(0,0,0,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {loading ? 'Guardando...' : 'Guardar Datos de Pago'}
        </button>
      </form>
    )
  }

  return null
}