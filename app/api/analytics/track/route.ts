// app/api/analytics/track/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { isValidUUID } from '@/utils/validations'; // 🚀 Importamos tu validador de UUIDs
import crypto from 'crypto';
import webpush from 'web-push';

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { store_id, event_type, product_id, url, referrer, dwell_time } = body

    // 1. Blindaje contra UUIDs corruptos o "undefined"
    if (!isValidUUID(store_id)) {
      return NextResponse.json({ success: false, error: 'Invalid store_id' }, { status: 400 })
    }

    if (product_id && !isValidUUID(product_id)) {
      return NextResponse.json({ success: false, error: 'Invalid product_id' }, { status: 400 })
    }

    // 2. Filtro Anti-Bots Avanzado
    const userAgent = req.headers.get('user-agent') || ''
    const isBot = /bot|crawler|spider|crawling|lighthouse|pingdom|gtmetrix|seo|archive/i.test(userAgent)
    if (isBot) return NextResponse.json({ success: true, note: 'bot ignored' })

    const device_type = /mobile|android|iphone|ipad|phone/i.test(userAgent.toLowerCase()) ? 'mobile' : 'desktop'
    const regionCode = req.headers.get('x-vercel-ip-country-region') || 'Desconocido'
    
    let referrer_source = 'direct'
    const refLower = (referrer || '').toLowerCase()
    
    if (refLower.includes('instagram') || refLower.includes('ig.me') || refLower.includes('l.instagram')) {
      referrer_source = 'instagram'
    } else if (refLower.includes('tiktok') || refLower.includes('vt.tiktok')) {
      referrer_source = 'tiktok'
    } else if (refLower.includes('wa.me') || refLower.includes('whatsapp') || refLower.includes('web.whatsapp')) {
      referrer_source = 'whatsapp'
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const date = new Date().toISOString().split('T')[0]
    const session_id = crypto
      .createHash('sha256')
      .update(`${ip}-${userAgent}-${date}`)
      .digest('hex')

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('analytics_raw_events').insert({
      store_id,
      session_id,
      event_type,
      product_id: product_id || null,
      url,
      referrer_source,
      device_type,
      location_state: regionCode,
      dwell_time: dwell_time || 0,
    })

    if (error) throw error

    // 🚀 NUEVA LÓGICA DE HITOS OPTIMIZADA POR HARDWARE (RPC)
    if (event_type === 'page_view') {
      const handleMilestoneCheck = async () => {
        try {
          const caracasTime = new Date(Date.now() - (4 * 60 * 60 * 1000));
          const todayDateCaracas = caracasTime.toISOString().split('T')[0];
          const localDayStart = `${todayDateCaracas}T00:00:00-04:00`;

          // A. ¿Ya se notificó este hito hoy? (Evita procesar el RPC si ya se celebró)
          const { count: alreadyNotified } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store_id)
            .eq('title', '¡Hito de Tráfico Alcanzado! 🚀')
            .gte('created_at', localDayStart);

          if (alreadyNotified && alreadyNotified > 0) return;

          // B. Invocar el RPC optimizado (La base de datos cuenta en <1ms)
          const { data: uniqueVisitsToday, error: rpcError } = await supabase
            .rpc('get_daily_unique_visits', { 
              p_store_id: store_id, 
              p_start_time: localDayStart 
            });

          if (rpcError) throw rpcError;

          // C. Disparar celebración si se llega al hito de 20 visitas únicas
          if (uniqueVisitsToday && uniqueVisitsToday >= 20) {
            const title = '¡Hito de Tráfico Alcanzado! 🚀';
            const message = `¡Tu tienda acaba de recibir su visitante número ${uniqueVisitsToday} de hoy! El catálogo está ganando tracción.`;

            const { error: insertError } = await supabase.from('notifications').insert({
              store_id,
              title,
              message,
              type: 'alert',
              link: '/admin/analytics'
            });

            // Escudo de concurrencia para evitar llaves duplicadas bajo alta demanda
            if (insertError) {
              if (insertError.code === '23505') return; 
              throw insertError;
            }

            const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('store_id', store_id);
            if (subs && subs.length > 0) {
              webpush.setVapidDetails(
                'mailto:quanzosinc@gmail.com',
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
                process.env.VAPID_PRIVATE_KEY!
              );

              const payload = JSON.stringify({
                title,
                body: message,
                url: '/admin/analytics',
                icon: '/favicon-light.png'
              });

              const pushPromises = subs.map(sub => {
                return webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload).catch(async (err) => {
                  if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                  }
                });
              });
              await Promise.all(pushPromises);
            }
          }
        } catch (err) {
          console.error('Error evaluando hito de tráfico:', err);
        }
      };

      handleMilestoneCheck();
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics Track Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}