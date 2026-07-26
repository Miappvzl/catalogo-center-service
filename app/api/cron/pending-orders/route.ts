import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export async function GET(request: Request) {
    try {
        // 🔒 SEGURIDAD VERCEL: Validamos autenticación del cron
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 1. Configurar Web Push
        webpush.setVapidDetails(
            'mailto:quanzosinc@gmail.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
        );

        // 2. Cliente de Supabase administrativo
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Calcular fecha límite (Más de 3 días de antigüedad)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const limitDateString = threeDaysAgo.toISOString();

        // 4. Buscar órdenes pendientes olvidadas
        const { data: pendingOrders, error: ordersError } = await supabase
            .from('orders')
            .select('id, store_id, order_number')
            .eq('status', 'pending')
            .lte('created_at', limitDateString);

        if (ordersError) throw ordersError;
        if (!pendingOrders || pendingOrders.length === 0) {
            return NextResponse.json({ success: true, message: 'No hay pedidos pendientes obsoletos.' });
        }

        // 5. Agrupar órdenes por store_id para evitar spam (Una sola notificación agrupada por tienda)
        const storeOrdersMap = new Map<string, number[]>();
        pendingOrders.forEach(order => {
            if (!storeOrdersMap.has(order.store_id)) {
                storeOrdersMap.set(order.store_id, []);
            }
            storeOrdersMap.get(order.store_id)!.push(order.order_number);
        });

        const notificationTasks = [];

        for (const [storeId, orderNumbers] of storeOrdersMap.entries()) {
            const count = orderNumbers.length;
            const title = 'Pedidos Pendientes Olvidados ⏳';
            const message = `Tienes ${count} pedidos pendientes desde hace más de 3 días. Pásalos a pagados para mantener tu caja al día.`;

            // A. Insertar notificación en Base de Datos (Campanita)
            const dbTask = supabase.from('notifications').insert({
                store_id: storeId,
                title,
                message,
                type: 'alert',
                link: '/admin/orders'
            });
            notificationTasks.push(dbTask);

            // B. Enviar Web Push a dispositivos vinculados
            const pushTask = async () => {
                const { data: subs } = await supabase
                    .from('push_subscriptions')
                    .select('*')
                    .eq('store_id', storeId);

                if (!subs || subs.length === 0) return;

                const payload = JSON.stringify({
                    title,
                    body: message,
                    url: '/admin/orders',
                    icon: '/favicon-light.png'
                });

                const pushPromises = subs.map(sub => {
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    };

                    return webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
                        // Limpieza de endpoints rotos o expirados
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                        }
                    });
                });

                await Promise.all(pushPromises);
            };

            notificationTasks.push(pushTask());
        }

        // 6. Procesar todo en paralelo
        await Promise.all(notificationTasks);

        return NextResponse.json({ success: true, message: 'Cron de pedidos pendientes ejecutado con éxito.' });

    } catch (error: any) {
        console.error('🔥 ERROR EN EL CRON DE PEDIDOS PENDIENTES:', error.message || error);
        return NextResponse.json({ error: 'Error interno del cron' }, { status: 500 });
    }
}