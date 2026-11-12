// app/admin/affiliates/page.tsx
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
  ArrowRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react'
import AffiliateClientControls from '@/components/admin/AffiliateClientControls'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AffiliateDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        }
      }
    }
  )

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cliente con privilegios de lectura administrativa si existe SERVICE_ROLE_KEY (evita que RLS oculte nombres de tiendas referidas)
  const adminReader = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      )
    : supabase

  const { data: store } = await supabase
    .from('stores')
    .select('slug')
    .eq('user_id', user.id)
    .single()

  const { data: affiliate } = await supabase
    .from('saas_affiliates')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!affiliate) {
    return (
      <div className="p-6 md:p-12 max-w-2xl mx-auto mt-16">
        <div className="bg-white p-10 md:p-14 rounded-2xl border border-neutral-200/70 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-neutral-950 text-white rounded-xl flex items-center justify-center mb-6">
            <Users size={26} strokeWidth={1.8} />
          </div>

          <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
            Programa exclusivo
          </span>

          <h1 className="text-2xl font-bold text-neutral-950 tracking-tight mb-3">
            Socios Preziso
          </h1>

          <p className="text-sm text-neutral-500 mb-8 max-w-sm leading-relaxed">
            Activa tu código único de socio, compártelo con otros comercios y genera{' '}
            <strong className="text-neutral-950 font-semibold">$5.00 USD</strong> por cada
            suscripción activa consolidada.
          </p>

          <div className="w-full max-w-xs">
            <AffiliateClientControls
              action="activate"
              storeSlug={store?.slug || 'SOCIO'}
            />
          </div>
        </div>
      </div>
    )
  }

  // 1. Consulta limpia de referidos (Sin el join roto que devolvía null)
  const { data: rawReferrals } = await adminReader
    .from('saas_referrals')
    .select('id, status, created_at, referred_user_id')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })

  // 2. Cruce en memoria O(1) con la tabla 'stores' para obtener nombre, slug y estado de prueba
  const referredUserIds = (rawReferrals || [])
    .map((r: any) => r.referred_user_id)
    .filter(Boolean)

  let storesMap = new Map<string, any>()
  if (referredUserIds.length > 0) {
    const { data: referredStores } = await adminReader
      .from('stores')
      .select('user_id, name, slug, trial_ends_at, subscription_status, subscription_ends_at, created_at')
      .in('user_id', referredUserIds)

    if (referredStores) {
      storesMap = new Map(referredStores.map((s: any) => [s.user_id, s]))
    }
  }

  const referrals = (rawReferrals || []).map((r: any) => ({
    ...r,
    storeData: storesMap.get(r.referred_user_id) || null
  }))

  // 3. Historial de comisiones
  const { data: commissions } = await adminReader
    .from('saas_commissions')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })

  const pendingTrialReferrals = referrals.filter((r) => r.status === 'pending')
  const convertedReferrals = referrals.filter((r) => r.status === 'converted')

  const pendingCount = pendingTrialReferrals.length
  const convertedCount = convertedReferrals.length

  const unpaidUsd =
    commissions
      ?.filter((c) => c.status === 'unpaid')
      .reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0
  const paidUsd =
    commissions
      ?.filter((c) => c.status === 'paid')
      .reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0

  const referralLink = `https://preziso.shop/?ref=${affiliate.referral_code}`
  const hasPaymentDetails =
    affiliate.payment_details?.bank && affiliate.payment_details?.phone

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-[#f8f9fa] min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Consola de Socios
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Seguimiento en vivo de comercios registrados con tu código único
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/70 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                {pendingCount}{' '}
                {pendingCount === 1
                  ? 'comercio en Fase de Prueba'
                  : 'comercios en Fase de Prueba'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-white text-neutral-800 text-xs font-mono font-semibold px-3.5 py-1.5 rounded-full border border-neutral-200/80">
            <ShieldCheck size={14} className="text-neutral-600" />
            <span>Código: #{affiliate.referral_code}</span>
          </div>
        </div>
      </div>

      {/* METRIC CARD GRID (4 KPIs CLAROS INCLUYENDO FASE DE PRUEBA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: POR COBRAR */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Por Cobrar
            </span>
            <div className="w-7 h-7 rounded-lg bg-neutral-50 flex items-center justify-center border border-neutral-100">
              <Wallet size={14} className="text-neutral-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
              ${unpaidUsd.toFixed(2)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">Disponible para retiro</p>
          </div>
        </div>

        {/* KPI 2: EN FASE DE PRUEBA (NUEVO KPI EXPLÍCITO) */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              En Fase de Prueba
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-200/50">
              <Clock size={14} className="text-amber-600" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
                {pendingCount}
              </p>
              <span className="text-xs font-medium text-amber-700">probando (7d)</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Potencial: +${(pendingCount * Number(affiliate.commission_amount ?? 5)).toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* KPI 3: CONSOLIDADOS / ACTIVOS */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Comercios Activos
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-200/50">
              <Users size={14} className="text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
                {convertedCount}
              </p>
              <span className="text-xs font-medium text-emerald-700">consolidados</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Ya pagaron su suscripción</p>
          </div>
        </div>

        {/* KPI 4: RETIROS HISTÓRICOS */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Total Cobrado
            </span>
            <div className="w-7 h-7 rounded-lg bg-neutral-50 flex items-center justify-center border border-neutral-100">
              <TrendingUp size={14} className="text-neutral-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
              ${paidUsd.toFixed(2)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">Pagado a tu cuenta</p>
          </div>
        </div>
      </div>

      {/* PANEL DE CÓDIGO ÚNICO & DATOS DE PAGO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PARTNER CODE PANEL */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 mb-3 uppercase tracking-wider">
              <span>Tu Código Único de Partner</span>
              <span className="font-mono text-[10px] text-neutral-500">
                Comisión: ${Number(affiliate.commission_amount || 5).toFixed(2)} USD / comercio
              </span>
            </div>

            <AffiliateClientControls
              action="partner_code_box"
              payload={{
                code: affiliate.referral_code,
                link: referralLink
              }}
            />
          </div>

          <div>
            {affiliate.discount_pct > 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50">
                <Sparkles size={14} strokeWidth={2} className="shrink-0" />
                <span>
                  Tu código <strong>{affiliate.referral_code}</strong> otorga automáticamente un{' '}
                  <strong>{affiliate.discount_pct}% de descuento</strong> a los comercios que lo ingresen.
                </span>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 leading-relaxed">
                Cada vez que un nuevo comercio ingrese tu código{' '}
                <strong className="text-neutral-700">{affiliate.referral_code}</strong> al crear
                su tienda o al activar su plan, aparecerá inmediatamente abajo en tu lista de
                comercios en prueba.
              </p>
            )}
          </div>
        </div>

        {/* PAYMENT DETAILS PANEL */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
                Método de Liquidación
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Especifique los datos de Pago Móvil donde procesar sus retiros
              </p>
            </div>

            {!hasPaymentDetails ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-rose-50 text-rose-600 px-2.5 py-1 rounded">
                <AlertCircle size={11} /> Requiere atención
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded">
                <CreditCard size={11} /> Configurado
              </span>
            )}
          </div>

          <AffiliateClientControls
            action="update_payment"
            payload={affiliate.payment_details}
          />
        </div>
      </div>

      {/* DIRECTORIO DETALLADO DE COMERCIOS EN FASE DE PRUEBA Y CONSOLIDADOS */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
              Comercios Vinculados con tu Código ({referrals.length})
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Monitorea quiénes están probando la plataforma (7 días gratis) y quiénes ya activaron su plan
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 font-semibold">
              {pendingCount} en prueba
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold">
              {convertedCount} pagados
            </span>
          </div>
        </div>

        {referrals.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-neutral-200 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-neutral-700">
              Aún no hay comercios registrados con tu código #{affiliate.referral_code}
            </p>
            <p className="text-[11px] text-neutral-400">
              En cuanto alguien ingrese tu código en el registro o en su suscripción, aparecerá aquí en tiempo real.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {referrals.map((ref: any) => {
              const st = ref.storeData
              const storeName = st?.name || 'Comercio en Configuración (Onboarding)'
              const storeSlug = st?.slug ? `${st.slug}.preziso.shop` : null
              const isConverted = ref.status === 'converted'

              const trialEnds = st?.trial_ends_at
                ? new Date(st.trial_ends_at)
                : new Date(new Date(ref.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
              const now = new Date()
              const diffMs = trialEnds.getTime() - now.getTime()
              const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

              return (
                <div
                  key={ref.id}
                  className="p-4 bg-neutral-50/60 border border-neutral-200/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-neutral-600 border border-neutral-200/80 shrink-0">
                      <Globe size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-neutral-900 truncate">
                          {storeName}
                        </p>
                        {storeSlug && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            ({storeSlug})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                        Vinculado el {new Date(ref.created_at).toLocaleDateString('es-VE')}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isConverted ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold px-3 py-1.5 rounded-full">
                        <CheckCircle2 size={13} />
                        <span>
                          Suscripción Activa (+$
                          {Number(affiliate.commission_amount ?? 5).toFixed(2)} USD)
                        </span>
                      </span>
                    ) : daysLeft > 0 ? (
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/70 text-xs font-semibold px-3 py-1.5 rounded-full">
                        <Clock size={13} className="text-amber-600" />
                        <span>
                          En Fase de Prueba • {daysLeft}{' '}
                          {daysLeft === 1 ? 'día restante' : 'días restantes'}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-600 border border-neutral-200 text-xs font-medium px-3 py-1.5 rounded-full">
                        <Clock size={13} />
                        <span>Prueba finalizada • Pendiente de activación</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* BANNER PARA CREADORES Y COMUNIDADES */}
      <div className="bg-neutral-950 text-white p-8 md:p-10 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded text-xs font-semibold tracking-wider text-neutral-300 uppercase">
            <Sparkles size={11} className="text-neutral-200" /> Beneficios para Comunidades
          </span>
          <h2 className="text-lg md:text-xl font-bold tracking-tight">
            ¿Tienes un canal de YouTube, TikTok o comunidad activa?
          </h2>
          <p className="text-sm text-neutral-400 max-w-xl leading-relaxed">
            Podemos asignar un porcentaje de descuento exclusivo a tu código único para que tu audiencia pague menos en su suscripción.
          </p>
        </div>

        <a
          href={`https://wa.me/584145811936?text=${encodeURIComponent(
            `Hola equipo Preziso, mi código de socio es ${affiliate.referral_code} y me gustaría solicitar un descuento especial para mi comunidad.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white text-neutral-950 font-semibold text-xs px-5 py-3 rounded-full hover:bg-neutral-100 transition-all shrink-0 active:scale-95"
        >
          <span>Solicitar Descuento en mi Código</span>
          <ArrowRight size={14} />
        </a>
      </div>

      {/* HISTORIAL DE COMISIONES LIQUIDADAS */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
            Historial de Comisiones
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Control de transacciones y estados de pago bancarios
          </p>
        </div>

        {!commissions || commissions.length === 0 ? (
          <p className="text-xs text-neutral-400 italic py-4">
            No hay comisiones liquidadas o pendientes hasta el momento.
          </p>
        ) : (
          <div className="space-y-3">
            {commissions.map((comm) => {
              const isPaid = comm.status === 'paid'
              return (
                <div
                  key={comm.id}
                  className="p-4 bg-neutral-50/50 border border-neutral-200/50 rounded-xl flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-900 text-base font-mono tracking-tight">
                      ${Number(comm.amount_usd).toFixed(2)} USD
                    </p>
                    <p className="text-xs text-neutral-400">
                      Generada el {new Date(comm.created_at).toLocaleDateString('es-VE')}
                    </p>
                  </div>
                  <div>
                    {isPaid ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/50 text-xs font-semibold px-3 py-1 rounded-full">
                          Pago completado
                        </span>
                        {comm.paid_at && (
                          <p className="text-xs text-neutral-400 mt-1 font-mono">
                            Procesado: {new Date(comm.paid_at).toLocaleDateString('es-VE')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-neutral-600 bg-neutral-100 text-xs font-semibold px-3 py-1 rounded-full">
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