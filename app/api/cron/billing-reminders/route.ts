import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// 1. Configuración Web Push
webpush.setVapidDetails(
    'mailto:quanzosinc@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

// 2. Cliente Supabase con privilegios absolutos (Service Role)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        // 🔒 SEGURIDAD VERCEL: Validamos que la petición venga del Cron oficial de Vercel
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

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
            // Calculamos la diferencia exacta en días
            const diffTime = endsAt.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let title = '';
            let message = '';
            let urgency = 'alert'; // Para el icono en la base de datos

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
                
                // Automáticamente le cambiamos el status a 'trial' (vencido) para que el frontend lo bloquee
                await supabase.from('stores').update({ subscription_status: 'trial' }).eq('id', store.id);
            } else {
                // Si no es 3, 1 o 0, saltamos a la siguiente tienda
                continue;
            }

            // Si llegamos aquí, la tienda está en la zona roja. 
            // PREPARAMOS FRENTE A (Campanita In-App)
            const dbNotification = supabase.from('notifications').insert({
                store_id: store.id,
                title: title,
                message: message,
                type: urgency,
                link: '/subscription' // Los mandamos directo al portal de pago
            });

            // PREPARAMOS FRENTE B (Web Push / Pantalla de Bloqueo)
            const pushTask = async () => {
                const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('store_id', store.id);
                if (!subs || subs.length === 0) return;

                const payload = JSON.stringify({
                    title: title,
                    body: message,
                    url: '/subscription',
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