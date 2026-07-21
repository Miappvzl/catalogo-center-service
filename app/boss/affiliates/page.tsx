'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Wallet, CheckCircle2, Loader2, AlertCircle, MessageSquare, Percent } from 'lucide-react'
import Swal from 'sweetalert2'
import { liquidateCommission, updateAffiliateDiscount } from '@/app/actions/affiliate-actions'

const ADMIN_EMAIL = 'quanzosinc@gmail.com'

export default function BossAffiliatesPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState<any[]>([])
  const [bcvRate, setBcvRate] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: config } = await supabase.from('app_config').select('usd_rate').eq('id', 1).single()
      if (config) setBcvRate(config.usd_rate)

      const { data: comms, error } = await supabase
        .from('saas_commissions')
        .select(`
          id, amount_usd, created_at, status,
          saas_affiliates (
            id, user_id, referral_code, discount_pct, payment_details
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error cargando comisiones en boss:', error)
      } else if (comms) {
        setCommissions(comms)
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

  // REQ #4: Cambiar el porcentaje de descuento del afiliado
  const handleDiscountChange = async (affiliateId: string, currentDiscount: number) => {
    const { value: newDiscount, isConfirmed } = await Swal.fire({
      title: 'Asignar Descuento a Comunidad',
      text: 'Define el % de descuento que otorgará el link de este afiliado:',
      input: 'number',
      inputValue: currentDiscount || 0,
      showCancelButton: true,
      confirmButtonText: 'Guardar %',
      confirmButtonColor: '#000',
      customClass: { popup: 'rounded-3xl' }
    })

    if (isConfirmed && newDiscount !== null) {
      try {
        await updateAffiliateDiscount(affiliateId, Number(newDiscount))
        Swal.fire({ icon: 'success', title: 'Descuento Actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 })
        fetchData()
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error')
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
        title: 'Datos Incompletos',
        text: 'El afiliado no ha configurado su Pago Móvil. No puedes liquidar aún.',
        customClass: { popup: 'rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-0' }
      })
    }

    const confirm = await Swal.fire({
      title: 'Liquidar Comisión',
      html: `
        <div class="text-left mt-4 bg-gray-50 p-4 rounded-2xl">
          <p class="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Transferir vía Pago Móvil:</p>
          <p class="font-mono text-sm text-black"><b>Banco:</b> ${details.bank}</p>
          <p class="font-mono text-sm text-black"><b>Cédula:</b> ${details.dni}</p>
          <p class="font-mono text-sm text-black"><b>Teléfono:</b> ${details.phone}</p>
          <div class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-end">
            <div>
              <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tasa BCV: ${bcvRate}</p>
              <p class="text-xs text-gray-900 font-bold">$${commission.amount_usd}</p>
            </div>
            <p class="text-2xl font-black text-black">Bs ${amountBs}</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Marcar como Pagado',
      confirmButtonColor: '#000',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-0' }
    })

    if (confirm.isConfirmed) {
      try {
        Swal.showLoading()
        await liquidateCommission(commission.id)
        
        // REQ #3: MENSAJE DE WHATSAPP ESTRUCTURADO Y AMIGABLE
        const message = `¡Hola! 🎉 Tu pago de $${commission.amount_usd} USD (${amountBs} Bs) por tu comisión de Afiliados Preziso ha sido realizado con éxito a tus datos de Pago Móvil (${details.bank} - ${details.dni}). ¡Muchas gracias por seguir impulsando la comunidad de Preziso! 🚀`
        const waUrl = `https://wa.me/${details.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`

        Swal.fire({
          icon: 'success',
          title: 'Liquidado con éxito',
          html: `
            <p class="text-xs text-gray-500 mb-4">¿Deseas notificar al afiliado por WhatsApp?</p>
            <a href="${waUrl}" target="_blank" class="bg-emerald-600 text-white font-bold text-xs uppercase px-5 py-3 rounded-xl inline-flex items-center gap-2 hover:bg-emerald-700">
              Notificar por WhatsApp
            </a>
          `,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Cerrar',
          customClass: { popup: 'rounded-3xl' }
        })

        fetchData()
      } catch (error: any) {
        Swal.fire('Error', error.message, 'error')
      }
    }
  }

  const unpaidCommissions = commissions.filter(c => c.status === 'unpaid')

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-black p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">Tesorería de Afiliados</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">God Mode • Tasa BCV: {bcvRate}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
          ) : unpaidCommissions.length === 0 ? (
            <div className="p-20 text-center text-gray-400 flex flex-col items-center">
              <CheckCircle2 size={40} className="mb-4 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-widest">Todo liquidado. No hay deudas pendientes.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-transparent border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                <tr>
                  <th className="px-8 py-6">Afiliado</th>
                  <th className="px-8 py-6">Monto USD</th>
                  <th className="px-8 py-6">Desc. Comunidad</th>
                  <th className="px-8 py-6">Estatus Pago Móvil</th>
                  <th className="px-8 py-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {unpaidCommissions.map(c => {
                  const affiliate = c.saas_affiliates
                  const hasDetails = affiliate?.payment_details?.bank
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-black text-black">{affiliate?.referral_code || 'S/N'}</p>
                        <p className="text-xs text-gray-500 font-medium">{new Date(c.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-lg font-black text-black tabular-nums">${c.amount_usd}</p>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleDiscountChange(affiliate.id, affiliate.discount_pct)}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Percent size={12} /> {affiliate?.discount_pct || 0}% desc.
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        {hasDetails ? (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full uppercase tracking-widest">Configurado</span>
                        ) : (
                          <span className="text-[10px] font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1 w-max"><AlertCircle size={12}/> Faltan Datos</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handlePay(c)}
                          className="bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-[0_8px_20px_rgb(0,0,0,0.12)] flex items-center gap-2 ml-auto"
                        >
                          <Wallet size={14} /> Liquidar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}