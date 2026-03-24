import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// 1. Configuramos el motor Push con tus llaves criptográficas
webpush.setVapidDetails(
    'mailto:quanzosinc@gmail.com', // ⚠️ Cambia esto por tu correo real de fundador
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

// 2. Cliente Supabase con privilegios absolutos
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { storeId, orderNumber, totalUsd, customerName } = await request.json();

        // 3. Buscamos a qué dispositivos debemos avisarle de esta venta
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('store_id', storeId);

        if (error || !subscriptions || subscriptions.length === 0) {
            // Si la tienda no ha activado notificaciones, no hacemos nada, pero es un éxito
            return NextResponse.json({ message: 'No hay dispositivos suscritos' }, { status: 200 });
        }

        // 4. El "paquete" de información que verá el administrador en su pantalla de bloqueo
        const payload = JSON.stringify({
            title: `¡Nuevo Pedido #${orderNumber}! 💸`,
            body: `${customerName} ha pagado $${totalUsd}.`,
            url: '/admin', // Al tocar la notificación, lo llevará a su panel
            icon: '/favicon-light.png'
        });

        // 5. Disparamos a todos los dispositivos en paralelo (Ej: Si el admin tiene PC y Celular)
        const notifications = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            return webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
                console.error('Error enviando push al dispositivo:', err);
                // Lógica de autolimpieza: Si el usuario borró la PWA, Google/Apple devuelven error 410 o 404
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            });
        });

        await Promise.all(notifications);

        return NextResponse.json({ success: true, message: 'Notificaciones disparadas con éxito' });

    } catch (error: any) {
        console.error('🔥 ERROR EN EL MOTOR PUSH:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}