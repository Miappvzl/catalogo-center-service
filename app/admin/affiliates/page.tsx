import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Wallet, TrendingUp, Users, CheckCircle2, AlertCircle } from 'lucide-react'
import AffiliateClientControls from '@/components/admin/AffiliateClientControls'

export default async function AffiliateDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase.from('stores').select('slug').eq('user_id', user.id).single()
  
  // Obtenemos el perfil de afiliado
  const { data: affiliate } = await supabase.from('saas_affiliates').select('*').eq('user_id', user.id).single()

  if (!affiliate) {
    return (
      <div className="p-8 max-w-3xl mx-auto mt-10 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <Users size={32} />
          </div>
          <h1 className="text-2xl font-black text-black mb-3 tracking-tight">Programa de Partners Preziso</h1>
          <p className="text-gray-500 mb-8 max-w-md text-sm leading-relaxed">
            Refiere a otros comercios y gana comisiones recurrentes en dólares directamente a tu Pago Móvil.
          </p>
          <AffiliateClientControls action="activate" storeSlug={store?.slug || 'PRZ'} />
        </div>
      </div>
    )
  }

  // Obtenemos estadísticas
  const { data: referrals } = await supabase.from('saas_referrals').select('status').eq('affiliate_id', affiliate.id)
  const { data: commissions } = await supabase.from('saas_commissions').select('amount_usd, status').eq('affiliate_id', affiliate.id)

  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0
  const convertedReferrals = referrals?.filter(r => r.status === 'converted').length || 0
  
  const unpaidUsd = commissions?.filter(c => c.status === 'unpaid').reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0
  const paidUsd = commissions?.filter(c => c.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0

  const referralLink = `https://preziso.shop/?ref=${affiliate.referral_code}`
  const hasPaymentDetails = affiliate.payment_details?.bank && affiliate.payment_details?.phone

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-black tracking-tight">Panel de Afiliado</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Monetiza tu red de contactos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Wallet size={14} /> Por Cobrar</p>
          <p className="text-4xl font-black text-black tabular-nums">${unpaidUsd.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp size={14} /> Total Retirado</p>
          <p className="text-4xl font-black text-black tabular-nums">${paidUsd.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14} /> Referidos</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-black tabular-nums">{convertedReferrals}</p>
            <p className="text-xs text-gray-400 font-medium mb-1">activos (+{pendingReferrals} pendientes)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Link Generator */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center">
          <h2 className="text-sm font-black text-black uppercase tracking-widest mb-4">Tu Enlace Único</h2>
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group">
            <p className="text-sm font-mono font-medium text-gray-600 truncate mr-4">{referralLink}</p>
            <AffiliateClientControls action="copy" payload={referralLink} />
          </div>
          {affiliate.discount_pct > 0 && (
            <p className="text-xs text-emerald-600 font-medium mt-4 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Tu enlace otorga un {affiliate.discount_pct}% de descuento.
            </p>
          )}
        </div>

        {/* Payment Details Form */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-sm font-black text-black uppercase tracking-widest">Datos de Pago Móvil</h2>
            {!hasPaymentDetails && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded-lg uppercase tracking-widest">
                <AlertCircle size={12}/> Faltan Datos
              </span>
            )}
          </div>
          <AffiliateClientControls action="update_payment" payload={affiliate.payment_details} />
        </div>
      </div>
    </div>
  )
}