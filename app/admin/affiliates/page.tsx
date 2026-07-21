import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Wallet, TrendingUp, Users, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react'
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
            Refiere a otros comercios y gana $5.00 por cada cliente que realice su primer pago.
          </p>
          <AffiliateClientControls action="activate" storeSlug={store?.slug || 'PRZ'} />
        </div>
      </div>
    )
  }

  // Obtenemos los referidos detallados con su tienda correspondiente
  const { data: referrals } = await supabase
    .from('saas_referrals')
    .select(`
      id, status, created_at, referred_user_id,
      stores:referred_user_id (name, trial_ends_at, subscription_status, created_at)
    `)
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })

  // Obtenemos el historial de comisiones
  const { data: commissions } = await supabase
    .from('saas_commissions')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })

  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0
  const convertedReferrals = referrals?.filter(r => r.status === 'converted').length || 0
  
  const unpaidUsd = commissions?.filter(c => c.status === 'unpaid').reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0
  const paidUsd = commissions?.filter(c => c.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0

  const referralLink = `https://preziso.shop/?ref=${affiliate.referral_code}`
  const hasPaymentDetails = affiliate.payment_details?.bank && affiliate.payment_details?.phone

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-black tracking-tight">Gana $ con Preziso 🚀</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Gana $5.00 fijación por cada negocio referido</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-(--radius-card) border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Wallet size={14} /> Por Cobrar</p>
          <p className="text-4xl font-black text-black tabular-nums">${unpaidUsd.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-(--radius-card) border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={14} /> Total Retirado</p>
          <p className="text-4xl font-black text-black tabular-nums">${paidUsd.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-(--radius-card)  border-t border-gray-100 ">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={14} /> Referidos</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-black tabular-nums">{convertedReferrals}</p>
            <p className="text-xs text-gray-400 font-medium mb-1">activos (+{pendingReferrals} en prueba)</p>
          </div>
        </div>
      </div>

      {/* Secciones de Configuración y Enlace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl flex flex-col justify-center">
          <h2 className="text-xs font-black text-black uppercase tracking-widest mb-4">Tu Enlace Único de Compartir</h2>
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group">
            <p className="text-xs md:text-sm font-mono font-medium text-gray-600 truncate mr-4">{referralLink}</p>
            <AffiliateClientControls action="copy" payload={referralLink} />
          </div>
          {affiliate.discount_pct > 0 ? (
            <p className="text-xs text-emerald-600 font-bold mt-4 flex items-center gap-1.5">
              <Sparkles size={14} /> Tu enlace otorga un {affiliate.discount_pct}% de descuento a tu comunidad.
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-3 italic">
              Comparte este enlace en tus redes. Tu referido obtendrá 7 días de prueba gratis.
            </p>
          )}
        </div>

        <div className="bg-white p-6 md:p-8 rounded-(--radius-card) border border-gray-200">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xs font-black text-black uppercase tracking-widest">Datos de Pago Móvil</h2>
            {!hasPaymentDetails && (
              <span className="flex items-center gap-1 text-[9px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded-lg uppercase tracking-widest">
                <AlertCircle size={12}/> Faltan Datos
              </span>
            )}
          </div>
          <AffiliateClientControls action="update_payment" payload={affiliate.payment_details} />
        </div>
      </div>

      {/* REQ #5: TABLA DE TRANSPARENCIA DE REFERIDOS */}
      <div className="bg-white p-6 md:p-8 rounded-(--radius-card) border-t border-gray-100">
        <h2 className="text-xs font-black text-black uppercase tracking-widest mb-6">Estado Transparente de Mis Referidos</h2>
        {(!referrals || referrals.length === 0) ? (
          <p className="text-xs text-gray-400 italic py-4">Aún no has invitado a nadie. Comparte tu enlace para comenzar.</p>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref: any) => {
              // @ts-ignore
              const storeData = Array.isArray(ref.stores) ? ref.stores[0] : ref.stores
              const storeName = storeData?.name || 'Comercio Registrado'
              const isConverted = ref.status === 'converted'

              // Cálculo de días restantes de prueba
              const trialEnds = storeData?.trial_ends_at ? new Date(storeData.trial_ends_at) : new Date()
              const now = new Date()
              const diffMs = trialEnds.getTime() - now.getTime()
              const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

              return (
                <div key={ref.id} className="p-4 bg-gray-50/70 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-black">{storeName}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      Registrado el {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {isConverted ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                        <Sparkles size={12} /> ¡Pagó su suscripción! (Comisión Generada)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                        <Clock size={12} /> {daysLeft} días restantes de prueba gratis
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* REQ #1: HISTORIAL DE LIQUIDACIONES Y PAGOS */}
      <div className="bg-white p-6 md:p-8 rounded-(--radius-card) border-t border-gray-100">
        <h2 className="text-xs font-black text-black uppercase tracking-widest mb-6">Historial de Comisiones</h2>
        {(!commissions || commissions.length === 0) ? (
          <p className="text-xs text-gray-400 italic py-4">No hay historial de comisiones aún.</p>
        ) : (
          <div className="space-y-3">
            {commissions.map((comm) => {
              const isPaid = comm.status === 'paid'
              return (
                <div key={comm.id} className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="font-black text-black text-base tabular-nums">${comm.amount_usd} USD</p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Generada el {new Date(comm.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {isPaid ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest">
                          <CheckCircle2 size={12} /> Liquidado
                        </span>
                        {comm.paid_at && (
                          <p className="text-[9px] text-gray-400 mt-1 font-mono">
                            Pagado el {new Date(comm.paid_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest">
                        <Clock size={12} /> En Proceso
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}