import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export async function GET(request: Request) {
    try {
        // 🔒 SEGURIDAD VERCEL: Validamos que la petición venga del Cron
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 1. Configuración Web Push (AHORA ESTÁ ADENTRO)
        webpush.setVapidDetails(
            'mailto:quanzosinc@gmail.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
        );

        // 2. Cliente Supabase (AHORA ESTÁ ADENTRO)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Extraemos todas las tiendas activas o en trial
        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name, trial_ends_at, subscription_status')
            .in('subscription_status', ['active', 'trial']);

        if (storesError || !stores) throw new Error('Error buscando tiendas');

        const today = new Date();
        const notificationsToSend = [];

        // 4. El Motor de Decisión
        for (const store of stores) {
            if (!store.trial_ends_at) continue;

            const endsAt = new Date(store.trial_ends_at);
            const diffTime = endsAt.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let title = '';
            let message = '';
            let urgency = 'alert'; 

            // Reglas de Retención: [3, 1, 0]
            if (diffDays === 3) {
                title = 'Vencimiento Próximo ⏳';
                message = 'A tu suscripción en Preziso le quedan 3 días. Renueva a tiempo para evitar interrupciones.';
            } else if (diffDays === 1) {
                title = 'Último Día de Suscripción ⚠️';
                message = 'Mañana vence tu plan. Asegura tu panel de control renovando hoy mismo.';
            } else if (diffDays === 0) {
                title = 'Suscripción Expirada 🚨';
                message = 'Tu tienda ha sido pausada. El catálogo público ya no es visible. Renueva ahora para reactivarla.';
                urgency = 'critical';
                await supabase.from('stores').update({ subscription_status: 'trial' }).eq('id', store.id);
            } else {
                continue;
            }

            // PREPARAMOS FRENTE A (Campanita In-App)
            const dbNotification = supabase.from('notifications').insert({
                store_id: store.id,
                title: title,
                message: message,
                type: urgency,
                link: '/subscription' 
            });

            // PREPARAMOS FRENTE B (Web Push / Pantalla de Bloqueo)
            const pushTask = async () => {
                const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('store_id', store.id);
                if (!subs || subs.length === 0) return;

                const payload = JSON.stringify({ title, body: message, url: '/subscription', icon: '/favicon-light.png' });

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
            };

            notificationsToSend.push(dbNotification);
            notificationsToSend.push(pushTask());
        }

        // 5. Ejecutamos todos los ataques en paralelo para máxima velocidad
        await Promise.all(notificationsToSend);

        return NextResponse.json({ success: true, message: 'Motor de retención ejecutado exitosamente' });

    } catch (error: any) {
        console.error('🔥 ERROR EN CRON DE FACTURACIÓN:', error);
        return NextResponse.json({ error: 'Error interno del cron' }, { status: 500 });
    }
}