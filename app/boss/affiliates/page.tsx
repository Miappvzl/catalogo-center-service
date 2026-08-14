'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Wallet, CheckCircle2, Loader2, AlertCircle, Percent, Users, Store, ArrowUpRight } from 'lucide-react'
import Swal from 'sweetalert2'
import { liquidateCommission, updateAffiliateDiscount } from '@/app/actions/affiliate-actions'

const ADMIN_EMAIL = 'quanzosinc@gmail.com'

export default function BossAffiliatesPage() {
  const supabase = getSupabase()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState<any[]>([])
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [bcvRate, setBcvRate] = useState(0)
  
  const [activeTab, setActiveTab] = useState<'payments' | 'network'>('payments')

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: config } = await supabase.from('app_config').select('usd_rate').eq('id', 1).single()
      if (config) setBcvRate(config.usd_rate)

      const { data: comms } = await supabase
        .from('saas_commissions')
        .select(`
          id, amount_usd, created_at, status,
          saas_affiliates (
            id, user_id, referral_code, discount_pct, payment_details
          )
        `)
        .eq('status', 'unpaid')
        .order('created_at', { ascending: false })

      if (comms) setCommissions(comms)

      const { data: affsData } = await supabase
        .from('saas_affiliates')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: storesData } = await supabase.from('stores').select('user_id, name')

      if (affsData && storesData) {
        const storeMap = new Map(storesData.map((s: any) => [s.user_id, s.name]))
        const enrichedAffs = affsData.map((a: any) => ({
          ...a,
          storeName: storeMap.get(a.user_id) || 'Tienda Desconocida'
        }))
        setAffiliates(enrichedAffs)
      }

    } catch (e) {
      console.error('Error imprevisto en fetchData:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const verify = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) return router.replace('/admin')
      fetchData()
    }
    verify()
  }, [])

  const handleDiscountChange = async (affiliateId: string, currentDiscount: number, storeName: string) => {
    const { value: newDiscount, isConfirmed } = await Swal.fire({
      title: 'Asignar Beneficio',
      html: `Define el porcentaje de descuento promocional que otorgará el enlace de <b>${storeName}</b> a su comunidad:`,
      input: 'number',
      inputValue: currentDiscount || 0,
      showCancelButton: true,
      confirmButtonText: 'Guardar %',
      confirmButtonColor: '#171717',
      cancelButtonText: 'Cancelar',
      customClass: { 
        popup: 'rounded-xl font-sans text-xs border border-neutral-200/50 shadow-lg',
        confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-950 hover:bg-black text-white transition-all',
        cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all border border-neutral-200/50',
        input: 'rounded-lg border-neutral-200/50 text-sm font-mono text-center focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900'
      }
    })

    if (isConfirmed && newDiscount !== null) {
      try {
        Swal.showLoading()
        await updateAffiliateDiscount(affiliateId, Number(newDiscount))
        Swal.fire({ 
          icon: 'success', 
          title: 'Descuento Actualizado', 
          toast: true, 
          position: 'top-end', 
          showConfirmButton: false, 
          timer: 2000,
          customClass: { popup: 'bg-neutral-900 text-white rounded-lg text-xs font-semibold border border-neutral-800' }
        })
        fetchData()
      } catch (err: any) {
        Swal.fire({ title: 'Error', text: err.message, icon: 'error', customClass: { popup: 'rounded-xl font-sans text-xs' }, confirmButtonColor: '#171717' })
      }
    }
  }

  const handlePay = async (commission: any) => {
    const affiliate = commission.saas_affiliates
    const details = affiliate?.payment_details
    const amountBs = (commission.amount_usd * bcvRate).toFixed(2)

    if (!details?.bank || !details?.phone || !details?.dni) {
      return Swal.fire({
        icon: 'error',
        title: 'Expediente Incompleto',
        text: 'El socio comercial no ha configurado sus datos de liquidación (Pago Móvil). Operación retenida.',
        confirmButtonColor: '#171717',
        customClass: { popup: 'rounded-xl font-sans text-xs border border-neutral-200/50 shadow-lg' }
      })
    }

    const confirm = await Swal.fire({
      title: 'Liquidar Comisión',
      html: `
        <div class="text-left mt-3 bg-neutral-50 border border-neutral-200/50 p-4 rounded-xl">
          <p class="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-2.5">Protocolo de Pago Móvil:</p>
          <p class="font-mono text-xs text-neutral-800 mb-1"><b>Banco:</b> ${details.bank}</p>
          <p class="font-mono text-xs text-neutral-800 mb-1"><b>Cédula:</b> ${details.dni}</p>
          <p class="font-mono text-xs text-neutral-800 mb-3"><b>Teléfono:</b> ${details.phone}</p>
          
          <div class="pt-3 border-t border-neutral-200/60 flex justify-between items-end">
            <div>
              <p class="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Tasa BCV: ${bcvRate}</p>
              <p class="text-xs text-neutral-900 font-bold font-mono">$${commission.amount_usd.toFixed(2)}</p>
            </div>
            <p class="text-lg font-bold text-neutral-900 font-mono tracking-tight">Bs ${amountBs}</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Registrar Liquidación',
      confirmButtonColor: '#171717',
      cancelButtonText: 'Cancelar',
      customClass: { 
        popup: 'rounded-xl font-sans text-xs border border-neutral-200/50 shadow-lg',
        confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-950 hover:bg-black text-white transition-all',
        cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all border border-neutral-200/50'
      }
    })

    if (confirm.isConfirmed) {
      try {
        Swal.showLoading()
        await liquidateCommission(commission.id)
        
        const message = `¡Hola! 🎉 Tu pago de $${commission.amount_usd} USD (${amountBs} Bs) por tu comisión de Afiliados Preziso ha sido procesado con éxito a tus datos de Pago Móvil (${details.bank} - ${details.dni}). ¡Muchas gracias por seguir impulsando la red de Preziso! 🚀`
        const waUrl = `https://wa.me/${details.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`

        Swal.fire({
          icon: 'success',
          title: 'Transacción Procesada',
          html: `
            <p class="text-xs text-neutral-500 mb-5">El registro de la liquidación ha sido guardado. ¿Desea notificar al socio mediante un comprobante por WhatsApp?</p>
            <a href="${waUrl}" target="_blank" class="bg-emerald-50 border border-emerald-100/50 text-emerald-700 font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors w-full">
              Enviar notificación vía WhatsApp <ArrowUpRight size={13} strokeWidth={2.5} />
            </a>
          `,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Cerrar panel',
          customClass: { 
            popup: 'rounded-xl font-sans text-xs border border-neutral-200/50 shadow-lg',
            cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all mt-3 w-full'
          }
        })

        fetchData()
      } catch (error: any) {
        Swal.fire({ title: 'Error', text: error.message, icon: 'error', customClass: { popup: 'rounded-xl font-sans text-xs' }, confirmButtonColor: '#171717' })
      }
    }
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center"><Loader2 className="animate-spin text-neutral-300" size={24} /></div>

  return (
    <div className="min-h-screen bg-[#FAFAFC] pb-24 font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white antialiased">
      
      {/* HEADER NATIVO */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-3.5 flex justify-between items-center border-b border-neutral-200/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-950 text-white rounded-lg flex items-center justify-center shadow-xs shrink-0">
            <ShieldAlert size={14} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-neutral-900 leading-none">Administración de Red</h1>
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">
              God Mode • Tasa Sincronizada: {bcvRate.toFixed(2)}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        
        {/* TAB CONTROL (Segmented Style) */}
        <div className="flex p-1 bg-neutral-100/50 rounded-lg border border-neutral-200/50 relative w-fit mx-auto md:mx-0">
          <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-xs border border-neutral-200/50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${activeTab === 'payments' ? 'translate-x-0' : 'translate-x-full'}`}
          />
          
          <button 
              onClick={() => setActiveTab('payments')} 
              className={`relative z-10 w-40 md:w-48 py-2 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors duration-300 ${activeTab === 'payments' ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
              <Wallet size={14} strokeWidth={2} /> Pagos Pendientes
              {commissions.length > 0 && (
                <span className="bg-rose-50 border border-rose-100/40 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ml-1">
                  {commissions.length}
                </span>
              )}
          </button>
          <button 
              onClick={() => setActiveTab('network')} 
              className={`relative z-10 w-40 md:w-48 py-2 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors duration-300 ${activeTab === 'network' ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
              <Users size={14} strokeWidth={2} /> Nodos de Red
          </button>
        </div>

        {/* CONTENEDOR DE TABLAS (Cleanlook Data Grid) */}
        <div className="bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden">
            
            {/* PESTAÑA 1: PAGOS PENDIENTES */}
            {activeTab === 'payments' && (
              commissions.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100/40">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-neutral-800">Cuentas conciliadas</p>
                    <p className="text-[11px] font-medium text-neutral-400">Todas las liquidaciones de la red están al día.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50/50 border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                      <tr>
                        <th className="px-6 py-4">Afiliado / Fecha</th>
                        <th className="px-6 py-4">Monto Consolidado</th>
                        <th className="px-6 py-4">Estatus KYC (Liquidación)</th>
                        <th className="px-6 py-4 text-right">Controles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {commissions.map(c => {
                        const affiliate = c.saas_affiliates
                        const hasDetails = affiliate?.payment_details?.bank
                        return (
                          <tr key={c.id} className="hover:bg-neutral-50/40 transition-colors">
                            <td className="px-6 py-3.5">
                              <p className="font-semibold text-xs text-neutral-900">{affiliate?.referral_code || 'No asignado'}</p>
                              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{new Date(c.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <p className="text-sm font-bold text-neutral-900 font-mono">${c.amount_usd.toFixed(2)}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              {hasDetails ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-50 border border-emerald-100/40 text-emerald-700 px-2 py-1 rounded">
                                  <CheckCircle2 size={10} /> Configurado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-rose-50 border border-rose-100/40 text-rose-700 px-2 py-1 rounded">
                                  <AlertCircle size={10} /> Retenido (Sin Datos)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <button
                                onClick={() => handlePay(c)}
                                className="bg-neutral-950 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto hover:bg-black active:scale-[0.98] transition-all shadow-xs"
                              >
                                <Wallet size={12} /> Liquidar Pago
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* PESTAÑA 2: RED DE AFILIADOS */}
            {activeTab === 'network' && (
              affiliates.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center border border-neutral-100">
                    <Users size={20} className="text-neutral-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-neutral-800">Red inactiva</p>
                    <p className="text-[11px] font-medium text-neutral-400">Aún no existen nodos de afiliados registrados en el sistema.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50/50 border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                      <tr>
                        <th className="px-6 py-4">Entidad Comercial</th>
                        <th className="px-6 py-4">ID de Referido</th>
                        <th className="px-6 py-4">Activación</th>
                        <th className="px-6 py-4 text-right">Estrategia / Descuento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {affiliates.map(aff => (
                        <tr key={aff.id} className="hover:bg-neutral-50/40 transition-colors">
                          <td className="px-6 py-3.5">
                            <p className="font-semibold text-xs text-neutral-900 flex items-center gap-2">
                              <Store size={12} className="text-neutral-400 shrink-0" /> 
                              <span className="truncate max-w-[200px]">{aff.storeName}</span>
                            </p>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-mono text-[10px] font-semibold bg-neutral-50 border border-neutral-200/60 px-2 py-0.5 rounded text-neutral-600">
                              {aff.referral_code}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <p className="text-[10px] text-neutral-400 font-mono">{new Date(aff.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleDiscountChange(aff.id, aff.discount_pct, aff.storeName)}
                              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded transition-all active:scale-[0.98] ${
                                aff.discount_pct > 0 
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100/40' 
                                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200/50'
                              }`}
                            >
                              <Percent size={11} /> {aff.discount_pct}% Asignado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
        </div>
      </main>
    </div>
  )
}