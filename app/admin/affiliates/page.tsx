import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Globe, 
  ArrowUpRight, 
  ArrowRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react'
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
      <div className="p-6 md:p-12 max-w-2xl mx-auto mt-16">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-neutral-950 text-white rounded-xl flex items-center justify-center mb-6">
            <Users size={22} strokeWidth={1.8} />
          </div>
          
          <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3">
            Programa exclusivo
          </span>
          
          <h1 className="text-xl font-bold text-neutral-950 tracking-tight mb-2">
            Socios Preziso
          </h1>
          
          <p className="text-xs text-neutral-400 mb-8 max-w-sm leading-relaxed">
            Comparte la plataforma con otros comercios y genera un beneficio recurrente de <strong className="text-neutral-900 font-semibold">$5.00</strong> por cada primer pago mensual consolidado.
          </p>
          
          <div className="w-full max-w-xs">
            <AffiliateClientControls action="activate" storeSlug={store?.slug || 'PRZ'} />
          </div>
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 bg-[#FAFAFC] min-h-screen">
      
      {/* HEADER SECTION (CLEAN & MINIMAL) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Consola de Socios</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Programa de incentivos por volumen de comercios referidos</p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-neutral-100 text-neutral-600 text-[10px] font-medium px-2.5 py-1 rounded-md max-w-max">
          <ShieldCheck size={12} className="text-neutral-500" />
          <span>Socio Identificado: #{affiliate.referral_code}</span>
        </div>
      </div>

      {/* METRIC CARD GRID (BORDERLESS HIGH ELEVATION) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* METRIC: UNPAID */}
        <div className="bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="text-[11px] font-medium">Por Cobrar</span>
            <div className="w-5 h-5 rounded bg-neutral-50 flex items-center justify-center">
              <Wallet size={12} className="text-neutral-500" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">${unpaidUsd.toFixed(2)}</p>
            <p className="text-[10px] text-neutral-400 mt-1">Disponible en el próximo ciclo</p>
          </div>
        </div>

        {/* METRIC: PAID */}
        <div className="bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="text-[11px] font-medium">Retiros Históricos</span>
            <div className="w-5 h-5 rounded bg-neutral-50 flex items-center justify-center">
              <TrendingUp size={12} className="text-neutral-500" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">${paidUsd.toFixed(2)}</p>
            <p className="text-[10px] text-neutral-400 mt-1">Transferido exitosamente</p>
          </div>
        </div>

        {/* METRIC: CONVERTED */}
        <div className="bg-white p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-neutral-400">
            <span className="text-[11px] font-medium">Total Referidos</span>
            <div className="w-5 h-5 rounded bg-neutral-50 flex items-center justify-center">
              <Users size={12} className="text-neutral-500" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">{convertedReferrals}</p>
              <span className="text-[10px] font-medium text-neutral-400">activos</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">+{pendingReferrals} cuentas en fase de prueba</p>
          </div>
        </div>
      </div>

      {/* SHARING & ACCOUNT SETTINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* LINK SHARE PANEL */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400 mb-2">
              <span>TU ENLACE ÚNICO</span>
              <span className="text-neutral-300">Preziso Partner Link</span>
            </div>
            
            <div className="bg-neutral-50/50 p-3 rounded-lg flex items-center justify-between">
              <p className="text-xs font-mono text-neutral-600 truncate mr-3">{referralLink}</p>
              <AffiliateClientControls action="copy" payload={referralLink} />
            </div>
          </div>

          <div>
            {affiliate.discount_pct > 0 ? (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg">
                <Sparkles size={12} strokeWidth={2} />
                <span>Tu código de afiliado activa un <strong>{affiliate.discount_pct}% de descuento</strong> a tu comunidad.</span>
              </div>
            ) : (
              <p className="text-[10px] text-neutral-400">
                Al usar tu enlace, los nuevos comercios obtienen automáticamente un período de prueba de 7 días sin costo.
              </p>
            )}
          </div>
        </div>

        {/* PAYMENT DETAILS PANEL */}
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xs font-semibold text-neutral-900">Método de Liquidación</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5">Defina dónde transferir sus ingresos generados</p>
            </div>
            
            {!hasPaymentDetails ? (
              <span className="flex items-center gap-1 text-[9px] font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded">
                <AlertCircle size={10} /> Requiere atención
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
                <CreditCard size={10} /> Configurado
              </span>
            )}
          </div>

          <AffiliateClientControls action="update_payment" payload={affiliate.payment_details} />
        </div>
      </div>

      {/* CREATORS CTA CARD (MINIMAL DEEP THEME) */}
      <div className="bg-neutral-950 text-white p-6 md:p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider text-neutral-300 uppercase">
            <Sparkles size={10} className="text-neutral-200" /> Creadores de contenido
          </span>
          <h2 className="text-base font-bold tracking-tight">¿Tienes un canal o comunidad activa?</h2>
          <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
            Podemos personalizar un beneficio único de descuento para tus referidos durante su primer mes. Contáctanos para habilitarlo.
          </p>
        </div>
        
        <a
          href={`https://wa.me/584145811936?text=${encodeURIComponent("Hola equipo Preziso, tengo una comunidad en mis redes sociales y me gustaría solicitar un descuento especial para mis referidos.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-white text-neutral-950 font-semibold text-xs px-4 py-2.5 rounded-lg hover:bg-neutral-100 transition-all shrink-0 active:scale-95"
        >
          <span>Solicitar Incentivo</span>
          <ArrowRight size={13} />
        </a>
      </div>

      {/* REFERRAL TRANSPARENCY LIST (BORDERLESS STYLE) */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
        <div>
          <h2 className="text-xs font-semibold text-neutral-900">Historial de Invitaciones</h2>
          <p className="text-[10px] text-neutral-400 mt-0.5">Control de registros efectuados bajo tu enlace</p>
        </div>

        {(!referrals || referrals.length === 0) ? (
          <p className="text-xs text-neutral-400 italic py-4">Aún no has invitado a nadie. Comparte tu enlace para comenzar.</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((ref: any) => {
              const storeData = Array.isArray(ref.stores) ? ref.stores[0] : ref.stores
              const storeName = storeData?.name || 'Nuevo Comercio'
              const isConverted = ref.status === 'converted'

              const trialEnds = storeData?.trial_ends_at ? new Date(storeData.trial_ends_at) : new Date()
              const now = new Date()
              const diffMs = trialEnds.getTime() - now.getTime()
              const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

              return (
                <div key={ref.id} className="p-3 bg-neutral-50/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-neutral-400">
                      <Globe size={11} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-neutral-900 leading-tight">{storeName}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                        Registro: {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isConverted ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-1 rounded">
                        <CheckCircle2 size={11} /> Primer mes liquidado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-[10px] font-semibold px-2 py-1 rounded">
                        <Clock size={11} /> {daysLeft}d de prueba restantes
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* LIQUIDATIONS HISTORY (BORDERLESS STYLE) */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
        <div>
          <h2 className="text-xs font-semibold text-neutral-900">Historial de Comisiones</h2>
          <p className="text-[10px] text-neutral-400 mt-0.5">Control de transacciones y estados de pago</p>
        </div>

        {(!commissions || commissions.length === 0) ? (
          <p className="text-xs text-neutral-400 italic py-4">No hay transacciones registradas hasta el momento.</p>
        ) : (
          <div className="space-y-2">
            {commissions.map((comm) => {
              const isPaid = comm.status === 'paid'
              return (
                <div key={comm.id} className="p-3 bg-neutral-50/50 rounded-lg flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-neutral-900 text-sm font-mono tracking-tight">${comm.amount_usd} USD</p>
                    <p className="text-[10px] text-neutral-400">
                      Fecha: {new Date(comm.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {isPaid ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Pago completado
                        </span>
                        {comm.paid_at && (
                          <p className="text-[9px] text-neutral-400 mt-1 font-mono">
                            {new Date(comm.paid_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-neutral-500 bg-neutral-100 text-[10px] font-semibold px-2 py-0.5 rounded">
                        Pendiente de cobro
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