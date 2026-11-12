// components/admin/AffiliateClientControls.tsx
'use client'

import { useState } from 'react'
import { Copy, Check, Loader2, Rocket, Save, Edit3, Link2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  activateAffiliateProgram,
  updatePaymentDetails,
  updateMyPartnerCode
} from '@/app/actions/affiliate-actions'

interface AffiliateClientControlsProps {
  action: 'activate' | 'copy' | 'partner_code_box' | 'update_payment'
  storeSlug?: string
  payload?: any
}

export default function AffiliateClientControls({
  action,
  storeSlug,
  payload
}: AffiliateClientControlsProps) {
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Estados para personalización del código único
  const [customInitCode, setCustomInitCode] = useState(
    (storeSlug || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)
  )
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [editableCode, setEditableCode] = useState(payload?.code || '')

  // Estados para el formulario de Pago Móvil
  const [bank, setBank] = useState(payload?.bank || '')
  const [dni, setDni] = useState(payload?.dni || '')
  const [phone, setPhone] = useState(payload?.phone || '')

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!storeSlug) return
    setLoading(true)
    try {
      await activateAffiliateProgram(storeSlug, customInitCode.trim() || undefined)
      toast.success('¡Tu código único de socio ha sido activado!')
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al activar tu código.')
      setLoading(false)
    }
  }

  const handleCopyText = (text: string, type: 'code' | 'link') => {
    if (!text) return
    navigator.clipboard.writeText(text)
    if (type === 'code') {
      setCopiedCode(true)
      toast.success(`Código "${text}" copiado al portapapeles`)
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedLink(true)
      toast.success('Enlace secundario copiado')
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleSaveCustomCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = editableCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    if (cleaned.length < 3) {
      toast.error('El código debe tener al menos 3 caracteres')
      return
    }
    setLoading(true)
    try {
      const res = await updateMyPartnerCode(cleaned)
      setEditableCode(res.code)
      setIsEditingCode(false)
      toast.success(`Código actualizado a ${res.code}`)
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar el código')
    } finally {
      setLoading(false)
    }
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
  // RENDER 1: ACTIVACIÓN CON ELECCIÓN DE CÓDIGO ÚNICO
  // ---------------------------------------------------------------------------
  if (action === 'activate') {
    return (
      <form onSubmit={handleActivate} className="w-full space-y-3">
        <div className="text-left">
          <label className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest block mb-1.5 ml-1">
            Elige tu Código Único de Socio
          </label>
          <input
            type="text"
            maxLength={20}
            value={customInitCode}
            onChange={(e) =>
              setCustomInitCode(
                e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
              )
            }
            placeholder="EJ: SUPLESHOP"
            className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-950 rounded-xl px-4 py-3 text-center font-mono text-sm font-bold tracking-widest text-neutral-950 uppercase outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neutral-950 text-white px-6 py-3.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Rocket size={16} />}
          <span>{loading ? 'Activando...' : 'Activar mi Código de Socio'}</span>
        </button>
      </form>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER 2: CONSOLA DE CÓDIGO ÚNICO DE PARTNER (COPIAR + EDITAR EN VIVO)
  // ---------------------------------------------------------------------------
  if (action === 'partner_code_box') {
    const currentCode = payload?.code || ''
    const referralLink = payload?.link || `https://preziso.shop/?ref=${currentCode}`

    return (
      <div className="space-y-3">
        {!isEditingCode ? (
          <div className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-neutral-400 block">
                Código Único Activo
              </span>
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-neutral-950 truncate mt-0.5">
                {currentCode}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditableCode(currentCode)
                  setIsEditingCode(true)
                }}
                className="px-3.5 py-2 rounded-full border border-neutral-200 hover:border-neutral-900 bg-white text-neutral-700 hover:text-neutral-950 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
                title="Personalizar mi código"
              >
                <Edit3 size={12} />
                <span>Personalizar</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(currentCode, 'code')}
                className="px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSaveCustomCode}
            className="p-4 rounded-xl bg-white border border-neutral-900 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500">
                Nuevo Código Único (3 a 20 letras/números)
              </span>
              <button
                type="button"
                onClick={() => setIsEditingCode(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={20}
                autoFocus
                value={editableCode}
                onChange={(e) =>
                  setEditableCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                  )
                }
                placeholder="EJ: MIPARTNER10"
                className="flex-1 bg-neutral-50 border border-neutral-200 focus:border-neutral-950 rounded-xl px-3.5 py-2 font-mono text-sm font-bold tracking-wider text-neutral-950 uppercase outline-none"
              />

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 rounded-full bg-neutral-950 text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:bg-neutral-800 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Guardar</span>
              </button>
            </div>
          </form>
        )}

        {/* Opción secundaria discreta por si el partner también desea copiar link */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <span className="text-[11px] text-neutral-400">
            Tus referidos ingresan este código al crear su tienda o suscribirse.
          </span>
          <button
            type="button"
            onClick={() => handleCopyText(referralLink, 'link')}
            className="text-[10px] font-mono font-semibold text-neutral-500 hover:text-neutral-950 inline-flex items-center gap-1 shrink-0 ml-2 cursor-pointer transition-colors"
          >
            <Link2 size={12} />
            <span>{copiedLink ? 'Link copiado' : 'Copiar link opcional'}</span>
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER 3: COPIAR SIMPLE (COMPATIBILIDAD LEGACY)
  // ---------------------------------------------------------------------------
  if (action === 'copy') {
    return (
      <button
        onClick={() => handleCopyText(payload, 'code')}
        className="bg-white border border-neutral-200 text-neutral-950 px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:border-neutral-950 active:scale-95 transition-all shrink-0 cursor-pointer"
      >
        {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        {copiedCode ? 'Copiado' : 'Copiar'}
      </button>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER 4: FORMULARIO DE PAGO MÓVIL
  // ---------------------------------------------------------------------------
  if (action === 'update_payment') {
    return (
      <form onSubmit={handleUpdatePayment} className="space-y-4">
        <div>
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-1.5 block ml-1">
            Banco
          </label>
          <input
            type="text"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="Ej: Banesco (0134)"
            required
            className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-neutral-950 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-medium text-neutral-950 outline-none transition-all placeholder:text-neutral-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-1.5 block ml-1">
              Cédula / RIF
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value.toUpperCase())}
              placeholder="Ej: V12345678"
              required
              className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-neutral-950 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-medium text-neutral-950 outline-none transition-all placeholder:text-neutral-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-1.5 block ml-1">
              Teléfono
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Ej: 04141234567"
              required
              className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-neutral-950 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-medium text-neutral-950 outline-none transition-all placeholder:text-neutral-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !bank || !dni || !phone}
          className="w-full mt-2 bg-neutral-950 text-white px-6 py-3 rounded-full text-[10px] font-semibold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
          {loading ? 'Guardando...' : 'Guardar Datos de Pago'}
        </button>
      </form>
    )
  }

  return null
}