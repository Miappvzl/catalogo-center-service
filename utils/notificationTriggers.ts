import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

interface StockAlertParams {
    storeId: string;
    productId: number;
    productName: string;
    newStock: number;
    variantName?: string | null; // Opcional si el producto tiene variantes (ej: "L / Negro")
}

/**
 * Dispara una notificación de stock crítico (In-App y Push) para una tienda.
 * Incluye un cooldown de 24 horas por producto para evitar spam.
 */
export async function triggerCriticalStockAlert({
    storeId,
    productId,
    productName,
    newStock,
    variantName = null
}: StockAlertParams) {
    try {
        if (newStock > 3) return; // Solo alertamos si el stock es crítico (3 o menos)

        // 1. Inicializar cliente Supabase administrativo
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const todayDate = new Date().toISOString().split('T')[0];
        const itemIdentifier = variantName ? `${productName} (${variantName})` : productName;
        const alertTitle = 'Stock Crítico en Inventario ⚠️';
        const alertMessage = `Al artículo "${itemIdentifier}" solo le quedan ${newStock} unidades disponibles. Repón tu stock a tiempo.`;

        // 2. Cooldown de seguridad: ¿Ya notificamos este producto específico hoy?
        const { count: alreadyNotified } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('title', alertTitle)
            .like('message', `%${itemIdentifier}%`)
            .gte('created_at', `${todayDate}T00:00:00Z`);

        if (alreadyNotified && alreadyNotified > 0) {
            return; // Ya se generó una alerta hoy para este artículo, evitamos spam
        }

        // 3. Registrar notificación in-app (Campanita)
        await supabase.from('notifications').insert({
            store_id: storeId,
            title: alertTitle,
            message: alertMessage,
            type: 'alert',
            link: '/admin/inventory'
        });

        // 4. Enviar notificación Web Push
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('store_id', storeId);

        if (!subs || subs.length === 0) return;

        // Configurar Web Push
        webpush.setVapidDetails(
            'mailto:quanzosinc@gmail.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
        );

        const payload = JSON.stringify({
            title: alertTitle,
            body: alertMessage,
            url: '/admin/inventory',
            icon: '/favicon-light.png'
        });

        const pushPromises = subs.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            };

            return webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
                // Limpieza automática de endpoints obsoletos
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            });
        });

        await Promise.all(pushPromises);

    } catch (error) {
        console.error('🔥 Error en el disparador de stock crítico:', error);
    }
}