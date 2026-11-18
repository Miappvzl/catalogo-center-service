// app/api/analytics/track/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { isValidUUID } from '@/utils/validations';
import webpush from 'web-push';

// Escalones oficiales de tracción diaria en Preziso
const DAILY_MILESTONE_TIERS = [
  {
    threshold: 20,
    title: '¡Hito de Tráfico: 20 Visitas Hoy! 🚀',
    getMessage: (v: number) =>
      `¡Tu tienda acaba de alcanzar ${v} visitantes únicos hoy! El catálogo está ganando tracción.`
  },
  {
    threshold: 40,
    title: '¡Doble Tracción: 40 Visitas Hoy! 🔥',
    getMessage: (v: number) =>
      `¡Ya van ${v} personas explorando tu tienda hoy! El interés sigue en aumento.`
  },
  {
    threshold: 100,
    title: '¡Centenar de Visitas: 100 Hoy! ⚡',
    getMessage: (v: number) =>
      `¡Increíble! ${v} visitantes únicos han entrado a tu tienda en el día de hoy.`
  },
  {
    threshold: 200,
    title: '¡Tráfico Viral: 200 Visitas Hoy! 🏆',
    getMessage: (v: number) =>
      `¡Día de alto volumen! Tu catálogo ya suma ${v} visitantes únicos hoy.`
  },
  {
    threshold: 500,
    title: '¡Explosión de Tráfico: 500 Visitas Hoy! 👑',
    getMessage: (v: number) =>
      `¡Récord de audiencia! ${v} personas han visitado tu tienda hoy.`
  },
  {
    threshold: 1000,
    title: '¡Hito Élite: 1.000 Visitas Hoy! 💎',
    getMessage: (v: number) =>
      `¡Más de ${v} visitantes únicos en un solo día! Tu marca está imparable.`
  }
] as const;

interface StoreMilestoneState {
  highestNotifiedThreshold: number;
  estimatedVisitsToday: number;
  viewsSinceLastSync: number;
  lastSyncTs: number;
}

// Estado en memoria por tienda y día (Ahorra 95% de llamadas intermedias entre escalones)
const milestoneProgressCache = new Map<string, StoreMilestoneState>();

function getCaracasDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, event_type, product_id, url, referrer, dwell_time, session_id } = body;

    // 1. Blindaje de store_id (UUID)
    if (!isValidUUID(store_id)) {
      return NextResponse.json({ success: false, error: 'Invalid store_id' }, { status: 400 });
    }

    // 2. Blindaje de product_id (En PostgreSQL product_id es BIGINT entero, NO UUID)
    let resolvedProductId: number | null = null;
    if (product_id !== undefined && product_id !== null && product_id !== '') {
      const parsedId = Number(product_id);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid product_id' }, { status: 400 });
      }
      resolvedProductId = parsedId;
    }

    // 3. Filtro Anti-Bots Avanzado
    const userAgent = req.headers.get('user-agent') || '';
    const isBot = /bot|crawler|spider|crawling|lighthouse|pingdom|gtmetrix|seo|archive/i.test(userAgent);
    if (isBot) return NextResponse.json({ success: true, note: 'bot ignored' });

    const device_type = /mobile|android|iphone|ipad|phone/i.test(userAgent.toLowerCase()) ? 'mobile' : 'desktop';
    const regionCode = req.headers.get('x-vercel-ip-country-region') || 'Desconocido';

    let referrer_source = 'direct';
    const refLower = (referrer || '').toLowerCase();

    if (refLower.includes('instagram') || refLower.includes('ig.me') || refLower.includes('l.instagram')) {
      referrer_source = 'instagram';
    } else if (refLower.includes('tiktok') || refLower.includes('vt.tiktok')) {
      referrer_source = 'tiktok';
    } else if (refLower.includes('wa.me') || refLower.includes('whatsapp') || refLower.includes('web.whatsapp')) {
      referrer_source = 'whatsapp';
    }

    // 4. Registro en Vivo del 100% de los Eventos Reales (Visitas, Productos y Clics WhatsApp)
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('analytics_raw_events').insert({
      store_id,
      session_id: session_id || 'anonymous',
      event_type,
      product_id: resolvedProductId,
      url,
      referrer_source,
      device_type,
      location_state: regionCode,
      dwell_time: dwell_time || 0
    });

    if (error) throw error;

    // 5. Motor Escalable de Hitos Diarios (20 -> 40 -> 100 -> 200 -> 500 -> 1000)
    if (event_type === 'page_view') {
      const todayCaracas = getCaracasDateString();
      const cacheKey = `${store_id}:${todayCaracas}`;
      const nowTs = Date.now();

      const state: StoreMilestoneState = milestoneProgressCache.get(cacheKey) || {
        highestNotifiedThreshold: 0,
        estimatedVisitsToday: 0,
        viewsSinceLastSync: 0,
        lastSyncTs: 0
      };

      state.viewsSinceLastSync += 1;

      // Buscar cuál es el siguiente escalón por alcanzar hoy
      const nextTier = DAILY_MILESTONE_TIERS.find(
        (t) => t.threshold > state.highestNotifiedThreshold
      );

      // Si aún queda un escalón superior por alcanzar hoy:
      if (nextTier) {
        const optimisticTotal = state.estimatedVisitsToday + state.viewsSinceLastSync;
        const shouldCheckDb =
          state.lastSyncTs === 0 ||
          optimisticTotal >= nextTier.threshold ||
          nowTs - state.lastSyncTs > 300000; // Sincronización de respaldo cada 5 min

        if (shouldCheckDb) {
          state.viewsSinceLastSync = 0;
          state.lastSyncTs = nowTs;

          try {
            const localDayStart = `${todayCaracas}T00:00:00-04:00`;

            // Contamos las visitas únicas reales del día en <1ms vía RPC
            const { data: uniqueVisitsToday, error: rpcError } = await supabase.rpc(
              'get_daily_unique_visits',
              {
                p_store_id: store_id,
                p_start_time: localDayStart
              }
            );

            if (!rpcError && typeof uniqueVisitsToday === 'number') {
              state.estimatedVisitsToday = uniqueVisitsToday;

              // Identificamos el escalón más alto alcanzado con las visitas actuales
              const reachedTiers = DAILY_MILESTONE_TIERS.filter(
                (t) => uniqueVisitsToday >= t.threshold
              );
              const highestReachedTier =
                reachedTiers.length > 0 ? reachedTiers[reachedTiers.length - 1] : null;

              if (
                highestReachedTier &&
                highestReachedTier.threshold > state.highestNotifiedThreshold
              ) {
                state.highestNotifiedThreshold = highestReachedTier.threshold;
                milestoneProgressCache.set(cacheKey, state);

                // Verificamos si este escalón específico ya fue notificado hoy en BD
                const { count: alreadySent } = await supabase
                  .from('notifications')
                  .select('id', { count: 'exact', head: true })
                  .eq('store_id', store_id)
                  .eq('title', highestReachedTier.title)
                  .gte('created_at', localDayStart);

                if (!alreadySent || alreadySent === 0) {
                  const message = highestReachedTier.getMessage(uniqueVisitsToday);

                  const { error: insertError } = await supabase
                    .from('notifications')
                    .insert({
                      store_id,
                      title: highestReachedTier.title,
                      message,
                      type: 'alert',
                      link: '/admin/analytics'
                    });

                  if (!insertError) {
                    const { data: subs } = await supabase
                      .from('push_subscriptions')
                      .select('*')
                      .eq('store_id', store_id);

                    if (subs && subs.length > 0) {
                      webpush.setVapidDetails(
                        'mailto:quanzosinc@gmail.com',
                        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
                        process.env.VAPID_PRIVATE_KEY!
                      );

                      const payload = JSON.stringify({
                        title: highestReachedTier.title,
                        body: message,
                        url: '/admin/analytics',
                        icon: '/favicon-light.png'
                      });

                      await Promise.all(
                        subs.map((sub) =>
                          webpush
                            .sendNotification(
                              {
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                              },
                              payload
                            )
                            .catch(async (err) => {
                              if (err.statusCode === 410 || err.statusCode === 404) {
                                await supabase
                                  .from('push_subscriptions')
                                  .delete()
                                  .eq('endpoint', sub.endpoint);
                              }
                            })
                        )
                      );
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error evaluando escalón de tráfico:', err);
          }
        }
      }

      milestoneProgressCache.set(cacheKey, state);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics Track Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}